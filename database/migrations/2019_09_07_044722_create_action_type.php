<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateActionType extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('action_type', function (Blueprint $table) {
			$table->increments('id');
			$table->string('name', 255)->unique();
			$table->string('key', 32)->unique();
		});
		DBHelper::createAuditTable('action_type');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('action_type');
		DBHelper::dropAuditTable('action_type');
	}
}
