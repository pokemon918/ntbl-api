<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class RenameTeamRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::rename('team_relation', 'team_user');
		DBHelper::renameAuditTable('team_relation', 'team_user');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::rename('team_user', 'team_relation');
		DBHelper::renameAuditTable('team_user', 'team_relation');
	}
}
