<?php
namespace App\Helpers;

use PDO;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Symfony\Component\Console\Output\ConsoleOutput;
use App\Models\Lang;
use App\Models\L18n;
use App\Models\Note;
use App\Models\NoteL18n;

class DBHelper
{
	private static $auditTablePrefix = null;
	private static $triggerSuffixes = [];

	public static function init()
	{
		if (empty(self::$auditTablePrefix)) {
			self::$auditTablePrefix = 'audit_';
		}

		if (empty(self::$triggerSuffixes)) {
			self::$triggerSuffixes = [
				'insert' => '__ai',
				'update' => '__au',
				'delete' => '__bd',
			];
		}
	}

	public static function createAuditTable($targetTable)
	{
		$auditTable = DB_PREFIX . self::$auditTablePrefix . $targetTable;
		self::cloneTable($targetTable, $auditTable);
		self::modifyAuditTablePrimaryID($targetTable, $auditTable);
		$indexes = self::extractIndexesFromTable($targetTable);
		self::dropIndexesFromTable($auditTable, $indexes);
		self::addCustomColumnsToAuditTable($auditTable);
		self::createTableTriggers($targetTable);
	}

	public static function renameAuditTable($oldTargetTable, $newTargetTable)
	{
		$oldAuditTable = DB_PREFIX . self::$auditTablePrefix . $oldTargetTable;
		$newAuditTable = DB_PREFIX . self::$auditTablePrefix . $newTargetTable;
		DB::statement("RENAME TABLE {$oldAuditTable} TO {$newAuditTable};");
		self::dropTableTriggers($oldTargetTable);
		self::createTableTriggers($newTargetTable);
	}

	public static function dropAuditTable($targetTable)
	{
		$auditTable = DB_PREFIX . 'audit_' . $targetTable;
		DB::statement('DROP TABLE IF EXISTS ' . $auditTable . ';');
		self::dropTableTriggers($targetTable);
	}

	public static function applyColumnsToAuditTable(Blueprint $table)
	{
		$auditTable = self::$auditTablePrefix . $table->getTable();
		Schema::table($auditTable, function (Blueprint $auditTable) use (&$table) {
			$columns = $table->getAddedColumns();
			if (!empty($columns)) {
				foreach ($columns as $column) {
					$type = $column->type; // For more info about all the available types, please check the class - Illuminate\Database\Schema\Blueprint
					switch ($type) {
						case 'char':
						case 'string':
							$auditTable->$type($column->name, $column->length);
							break;
						case 'float':
						case 'double':
						case 'decimal':
						case 'unsignedDecimal':
							$auditTable->$type($column->name, $column->total, $column->places);
							break;
						case 'enum':
						case 'set':
							$auditTable->$type($column->name, $column->allowed);
							break;
						default:
							$auditTable->$type($column->name);
					}
				}
				/*
					Note: column modifiers are ignored and not supported by this function:
					Example: autoIncrement, unsigned, default etc.
					For a full list please check - https://laravel.com/docs/5.8/migrations#column-modifiers
				*/
			}
		});
	}

	public static function dropColumnsFromAuditTable(Blueprint $table)
	{
		$auditTable = self::$auditTablePrefix . $table->getTable();
		Schema::table($auditTable, function (Blueprint $auditTable) use (&$table) {
			$commands = $table->getCommands();
			$columns = array_unique(Arr::flatten(Arr::pluck($commands, 'columns')));
			if (!empty($columns)) {
				foreach ($columns as $column) {
					$auditTable->dropColumn($column);
				}
			}
		});
	}

	public static function createTrigger($targetTable, $type, $id, $time = 'after', $row = 'NEW')
	{
		$triggerName = DB_PREFIX . $targetTable . self::$triggerSuffixes[$type];
		$dataTable = DB_PREFIX . $targetTable;
		$auditTable = DB_PREFIX . self::$auditTablePrefix . $targetTable;
		$typeToUpper = strtoupper($type);

		$query = "CREATE TRIGGER {$triggerName} {$time} {$typeToUpper} ON {$dataTable} \n";
		$query .= "FOR EACH ROW\n";
		$query .= "BEGIN\n";
		$query .= "INSERT INTO {$auditTable} SELECT NULL,'{$type}', NOW(), d.* FROM {$dataTable} AS d WHERE d.`$id` = `$row`.`$id`; \n";
		$query .= 'END';

		/*
			Note: $query will produce something like...
			CREATE TRIGGER ntbl_collection__bd before DELETE ON ntbl_collection 
			FOR EACH ROW
			BEGIN
			INSERT INTO ntbl_audit_collection SELECT NULL,'delete', NOW(), d.* FROM ntbl_collection AS d WHERE d.`id` = `OLD`.`id`; 
			END
		*/

		DB::unprepared($query);
	}

	public static function createTableTriggers($targetTable, $id = 'id')
	{
		self::createTrigger($targetTable, 'insert', $id);
		self::createTrigger($targetTable, 'update', $id);
		self::createTrigger($targetTable, 'delete', $id, 'before', 'OLD');
	}

	public static function dropTableTriggers($targetTable)
	{
		$targetTable = DB_PREFIX . $targetTable;
		foreach (self::$triggerSuffixes as $key => $suffix) {
			DB::unprepared("DROP TRIGGER IF EXISTS `{$targetTable}{$suffix}`;");
		}
	}

	public static function cloneTable($srcTableName, $destTableName)
	{
		DB::statement('CREATE TABLE ' . $destTableName . ' LIKE ' . DB_PREFIX . $srcTableName);
	}

	public static function extractIndexesFromTable($targetTable)
	{
		$result = DB::select('SHOW INDEX FROM ' . DB_PREFIX . $targetTable . ';');
		$indexes = Arr::pluck($result, 'Key_name');
		return $indexes;
	}

	public static function modifyAuditTablePrimaryID($targetTable, $auditTable)
	{
		if (Schema::hasColumn($targetTable, 'id')) {
			// Execute only if target table has a column named "id"
			DB::statement(
				'ALTER TABLE ' . $auditTable . ' DROP PRIMARY KEY, CHANGE id id int(10);'
			);
		}
	}

	public static function dropIndexesFromTable($auditTable, $indexes)
	{
		if (count($indexes) > 0) {
			for ($i = 0; $i < count($indexes); $i++) {
				if (Str::contains($indexes[$i], 'PRIMARY')) {
					continue;
				}

				$indexDB = DB::select(
					'SHOW INDEX FROM ' . $auditTable . " WHERE KEY_NAME = '" . $indexes[$i] . "'"
				);
				if (empty($indexDB)) {
					continue;
				}

				DB::statement('ALTER TABLE ' . $auditTable . ' DROP INDEX ' . $indexes[$i]);
			}
		}
	}

	public static function addCustomColumnsToAuditTable($auditTable)
	{
		/*
			Note: As of 10/22/2019, removed the user column from the audit table in favor of "api/612 Revert trigger-based audit"
			
			ADD `user` varchar(255) DEFAULT null AFTER `dt_datetime`

			In order to quickly restore, just append the sql line above in the sql below (after `action`)
		*/
		DB::statement(
			'ALTER TABLE ' .
				$auditTable .
				' ADD `revision` INT(10) NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST, ADD `action` varchar(255) NOT NULL AFTER `revision`, ADD `dt_datetime` timestamp NOT NULL AFTER `action`;'
		);
	}

	public static function addJsonFieldToTable($fieldname, Blueprint $table, $debug = false)
	{
		if (empty($fieldname)) {
			return;
		}

		$driver = DB::connection()
			->getPdo()
			->getAttribute(PDO::ATTR_DRIVER_NAME);

		// MySQL
		$requiredVersion = '5.7.8';
		$currentVersion = DB::connection()
			->getPdo()
			->getAttribute(PDO::ATTR_SERVER_VERSION);

		// MariaDB
		if (strpos($currentVersion, 'MariaDB') !== false) {
			$requiredVersion = '10.2.7-MariaDB';
			$currentVersion = DB::select('SELECT VERSION() as version')[0]->version;
		}

		$meetsRequiredVersion = version_compare($currentVersion, $requiredVersion, 'ge');
		$jsonSupported = $driver == 'mysql' && $meetsRequiredVersion;
		$output = new ConsoleOutput();

		if ($debug) {
			$output->writeln('Driver : ' . $driver);
			$output->writeln('Current Version : ' . $currentVersion);
			$output->writeln('Required Version : ' . $requiredVersion);
			$output->writeln('Json Supported : ' . ($jsonSupported ? 'true' : 'false'));
		}

		if ($jsonSupported) {
			$table->json($fieldname);
		} else {
			throw new Exception(
				'Flow halted: DB does not support json fields. Update DB or force use of text field by outcomenting line ' .
					__LINE__ .
					' in the file "' .
					__FILE__ .
					'"'
			);
			$table->text($fieldname);
		}
	}

	public static function ensureLanguage($key)
	{
		if (empty($key)) {
			return;
		}

		$key = strtolower($key);
		$lang = Lang::where('key', '=', $key)->first();

		if (empty($lang)) {
			$lang = new Lang([
				'key' => $key,
				'name' => ucfirst($key),
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
			$lang->save();
		}

		return $lang;
	}

	public static function ensureNote($key)
	{
		$note = Note::where('key', '=', $key)->first();

		if (empty($note)) {
			$note = new Note([
				'key' => $key,
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
			$note->save();
		}

		return $note;
	}

	public static function ensureL18N($langId, $value)
	{
		if (empty($langId) || empty($value)) {
			return;
		}

		$refLength = config('app.identity.refLength');
		$l18n = L18N::where([['lang_id', '=', $langId], ['val', '=', $value]])->first();

		if (empty($l18n)) {
			$l18n = new L18N([
				'ref' => StringHelper::readableRefGenerator($refLength, 'l18n', 'ref'),
				'lang_id' => $langId,
				'val' => $value,
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
			$l18n->save();
		}

		return $l18n;
	}

	public static function ensureNoteL18N($noteId, $l18nId)
	{
		if (empty($noteId) || empty($l18nId)) {
			return;
		}

		$notel18n = NoteL18n::where([
			['note_id', '=', $noteId],
			['l18n_id', '=', $l18nId],
		])->first();
		if (empty($notel18n)) {
			$notel18n = new NoteL18n([
				'note_id' => $noteId,
				'l18n_id' => $l18nId,
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
			$notel18n->save();
		}

		return $notel18n;
	}
}

DBHelper::init();
