<?php
namespace App\Traits;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Exception;

trait Auditable
{
	public static function bootAuditable()
	{
		self::created(function ($model) {
			self::audit($model, 'insert');
		});
		self::updated(function ($model) {
			self::audit($model, 'update');
		});
		self::deleted(function ($model) {
			self::audit($model, 'delete');
		});
	}

	private static function audit($model, $type)
	{
		$currentUser = Auth::user();
		if (!$currentUser) {
			return;
		}
		$dataTable = DB_PREFIX . $model->table;
		$auditTable = DB_PREFIX . 'audit_' . $model->table;
		$query = "INSERT INTO `{$auditTable}` SELECT NULL,'{$type}', NOW(), '{$currentUser->ref}', d.* FROM `{$dataTable}` AS d WHERE ";

		if (!empty($model->id)) {
			$query .= "`id` = {$model->id}";
		}

		if (!empty($model->auditKeys)) {
			$idExists = !empty($model->id);

			for ($i = 0; $i < count($model->auditKeys); $i++) {
				// Add "&&" if $model id was already added as WHERE but only in the first item
				if ($idExists && $i === 0) {
					$query .= ' && ';
				}

				$key = $model->auditKeys[$i];
				$value = is_string($model->$key) ? "'{$model->$key}'" : $model->$key;
				$query .= "`{$key}` = {$value} ";

				// Do not add && if it's the last key
				if ($i < count($model->auditKeys) - 1) {
					$query .= ' && ';
				}
			}
		}

		DB::statement($query);
	}
}
