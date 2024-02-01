<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateContestTeamTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('contest_team', function (Blueprint $table) {
			$table->increments('id');

			$table->integer('team_id')->unsigned();

			$table->string('admin_alias', 64);
			$table->string('leader_alias', 64);
			$table->string('guide_alias', 64);
			$table->string('participant_alias', 64);
			$table->string('collection_alias', 64);
			$table->string('division_alias', 64);
			$table->string('marked_impression_alias', 64);

			$table
				->foreign('team_id')
				->references('id')
				->on('team');

			$table->timestamps();
			$table->softDeletes();
		});
		DBHelper::createAuditTable('contest_team');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('contest_team');
		DBHelper::dropAuditTable('contest_team');
	}
}
