<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateTeamTypeTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('team_type', function (Blueprint $table) {
			$table->increments('id');
			$table->string('key', 32)->unique();
		});
		DBHelper::createAuditTable('team_type');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('team_type');
		DBHelper::dropAuditTable('team_type');
	}
}
