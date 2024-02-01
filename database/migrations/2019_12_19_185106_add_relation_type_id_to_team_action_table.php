<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddRelationTypeIdToTeamActionTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('team_action', function (Blueprint $table) {
			$table->integer('relation_type_id')->unsigned();
			$table
				->foreign('relation_type_id')
				->references('id')
				->on('relation_type');
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
		Schema::table('team_action', function (Blueprint $table) {
			$table->dropForeign(['relation_type_id']);
			$table->dropColumn('relation_type_id');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
