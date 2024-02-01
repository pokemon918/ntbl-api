<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddMetadataToTeamSubjectStatementTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('team_subject_statement', function (Blueprint $table) {
			DBHelper::addJsonFieldToTable('metadata', $table);
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
		Schema::table('team_subject_statement', function (Blueprint $table) {
			$table->dropColumn('metadata');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
