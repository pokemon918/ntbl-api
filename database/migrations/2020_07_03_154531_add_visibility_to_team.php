<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Helpers\DBHelper;

class AddVisibilityToTeam extends Migration
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
				->integer('visibility_id')
				->unsigned()
				->nullable();

			$table
				->foreign('visibility_id')
				->references('id')
				->on('visibility');

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
			$table->dropForeign(['visibility_id']);
			$table->dropColumn('visibility_id');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
