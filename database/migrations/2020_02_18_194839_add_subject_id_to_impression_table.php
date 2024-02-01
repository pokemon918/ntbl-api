<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddSubjectIdToImpressionTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('impression', function (Blueprint $table) {
			$table
				->integer('subject_id')
				->unsigned()
				->nullable();
			// Todo: make sure we do a: Update ntbl_prod_impression as i JOIN ntbl_prod_subject s on s.`impression_id` = i.id set i.subject_id = s.id

			$table
				->foreign('subject_id')
				->references('id')
				->on('subject');
			DBHelper::applyColumnsToAuditTable($table);
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('impression', function (Blueprint $table) {
			// Todo: make sure we do something like: Update ntbl_prod_impression as i JOIN ntbl_prod_subject s on i.subject_id = s.id set s.impression_id = i.id
			$table->dropForeign(['subject_id']);
			$table->dropColumn('subject_id');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
