<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddThemeAliasToContestTeamTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('contest_team', function (Blueprint $table) {
			$table->string('theme_alias', 64);
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
		Schema::table('contest_team', function (Blueprint $table) {
			$table->dropColumn('theme_alias');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
