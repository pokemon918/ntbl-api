<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddTimestampsToTeamRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('team_relation', function (Blueprint $table) {
			$table->timestamps();
			$table->softDeletes();
			$table->index('created_at');
			$table->index('updated_at');
			$table->index('deleted_at');
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
		Schema::table('team_relation', function ($table) {
			$table->dropTimestamps();
			$table->dropSoftDeletes();
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
