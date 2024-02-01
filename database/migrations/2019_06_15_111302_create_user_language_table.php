<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserLanguageTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_language', function (Blueprint $table) {
			$table->increments('id');
			$table->string('name', 255);
			$table->integer('user_demographic_id')->unsigned();

			$table
				->foreign('user_demographic_id')
				->references('id')
				->on('user_demographic');
		});
		DBHelper::createAuditTable('user_language');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_language');
		DBHelper::dropAuditTable('user_language');
	}
}
