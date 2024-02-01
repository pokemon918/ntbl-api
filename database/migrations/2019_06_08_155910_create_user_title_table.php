<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserTitleTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_title', function (Blueprint $table) {
			$table->increments('id');
			$table->string('key', 16)->unique();
			$table->string('name', 255)->unique();
		});
		DBHelper::createAuditTable('user_title');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_title');
		DBHelper::dropAuditTable('user_title');
	}
}
