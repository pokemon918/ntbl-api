<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CleanupSubjectTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('subject', function (Blueprint $table) {
			$table->dropForeign(['impression_id']);
			$table->dropColumn('impression_id');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('subject', function (Blueprint $table) {
			// 1. Restore the impression_id in the subject table
			$table
				->integer('impression_id')
				->nullable()
				->unsigned();
			$table
				->foreign('impression_id')
				->references('id')
				->on('impression');

			DBHelper::applyColumnsToAuditTable($table);
		});

		// 2. Restore the the data in the impression_id
		$impressionTbl = DB_PREFIX . 'impression';
		$subjectTbl = DB_PREFIX . 'subject';

		DB::statement(
			'UPDATE ' .
				$subjectTbl .
				' as s JOIN ' .
				$impressionTbl .
				' i on i.`subject_id` = s.id SET s.impression_id = i.id'
		);

		// 3. Restore the the data in audit tables as well
		$auditSubjectTbl = DB_PREFIX . 'audit_subject';

		DB::statement(
			'UPDATE ' .
				$auditSubjectTbl .
				' as s JOIN ' .
				$impressionTbl .
				' i on i.`subject_id` = s.id SET s.impression_id = i.id'
		);
	}
}
