<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateTeamRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('team_relation', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('user_id')->unsigned();
			$table->integer('relation_type_id')->unsigned();
			$table
				->integer('team_id')
				->unsigned()
				->nullable();

			$table
				->foreign('user_id')
				->references('id')
				->on('user');
			$table
				->foreign('relation_type_id')
				->references('id')
				->on('relation_type');
			$table
				->foreign('team_id')
				->references('id')
				->on('team');
		});
		DBHelper::createAuditTable('team_relation');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('team_relation');
		DBHelper::dropAuditTable('team_relation');
	}
}
