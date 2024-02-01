<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddUserRefToTeamSubjectStatementTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('team_subject_statement', function (Blueprint $table) {
			$table->string('user_ref', 16)->nullable();
			$table->index('user_ref');
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
			$table->dropIndex(['user_ref']);
			$table->dropColumn('user_ref');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
