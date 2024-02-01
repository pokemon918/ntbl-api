<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddTeamIdToImpressionTable extends Migration
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
				->integer('team_id')
				->unsigned()
				->nullable()
				->default(null);
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
			$table->dropColumn('team_id');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
