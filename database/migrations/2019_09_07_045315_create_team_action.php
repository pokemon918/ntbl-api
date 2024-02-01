<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateTeamAction extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('team_action', function (Blueprint $table) {
			$table->increments('id');
			$table->string('ref', 32)->unique();
			$table->integer('team_id')->unsigned();
			$table->integer('user_id')->unsigned();
			$table->integer('action_type_id')->unsigned();
			$table->string('status', 255);
			$table->timestamps();
			$table->softDeletes();

			$table
				->foreign('user_id')
				->references('id')
				->on('user');

			$table
				->foreign('team_id')
				->references('id')
				->on('team');

			$table
				->foreign('action_type_id')
				->references('id')
				->on('action_type');

			$table->index('created_at');
			$table->index('deleted_at');
		});
		DBHelper::createAuditTable('team_action');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('team_action');
		DBHelper::dropAuditTable('team_action');
	}
}
