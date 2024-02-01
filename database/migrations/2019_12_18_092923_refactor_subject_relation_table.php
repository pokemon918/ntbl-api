<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class RefactorSubjectRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('subject_relation', function (Blueprint $table) {
			$table->dropColumn('type');
			DBHelper::dropColumnsFromAuditTable($table);
			$table->renameColumn('tasting_id', 'impression_id');
		});

		Schema::table('audit_subject_relation', function (Blueprint $table) {
			$table->renameColumn('tasting_id', 'impression_id');
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('subject_relation', function (Blueprint $table) {
			$table->string('type')->default('impression');
			$table->renameColumn('impression_id', 'tasting_id');
			DBHelper::applyColumnsToAuditTable($table);
		});

		Schema::table('audit_subject_relation', function (Blueprint $table) {
			$table->renameColumn('impression_id', 'tasting_id');
		});
	}
}
