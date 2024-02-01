<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddTypeAndParentToTeamTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('team', function (Blueprint $table) {
			$table
				->integer('parent_id')
				->unsigned()
				->nullable()
				->default(null);

			$table
				->foreign('parent_id')
				->references('id')
				->on('team');

			$table
				->integer('team_type_id')
				->unsigned()
				->nullable()
				->default(null);

			$table
				->foreign('team_type_id')
				->references('id')
				->on('team_type');

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
		Schema::table('team', function (Blueprint $table) {
			$table->dropForeign(['parent_id']);
			$table->dropForeign(['team_type_id']);
			$table->dropColumn('parent_id');
			$table->dropColumn('team_type_id');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
