<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddSubjectIdsFromOldDbStructure extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		/**
		 * Create custom query to populate subject_ids for impressions from child subjects based on subject.impression_id
		 */
		$impressionTbl = DB_PREFIX . 'impression';
		$subjectTbl = DB_PREFIX . 'subject';
		DB::statement(
			'UPDATE ' .
				$impressionTbl .
				' as i JOIN ' .
				$subjectTbl .
				' s on s.`impression_id` = i.id SET i.subject_id = s.id'
		);

		$auditImpressionTbl = DB_PREFIX . 'audit_impression';
		DB::statement(
			'UPDATE ' .
				$auditImpressionTbl .
				' as i JOIN ' .
				$subjectTbl .
				' s on s.`impression_id` = i.id SET i.subject_id = s.id'
		);
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		/**
		 * Sets all the impression.subject_id back to NULL
		 */
		DB::statement('Update ' . DB_PREFIX . 'impression as i SET i.`subject_id` = NULL');
		DB::statement('Update ' . DB_PREFIX . 'audit_impression as i SET i.`subject_id` = NULL');
	}
}
