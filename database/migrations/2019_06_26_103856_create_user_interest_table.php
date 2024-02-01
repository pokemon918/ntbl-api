<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserInterestTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_interest', function (Blueprint $table) {
			$table->increments('id');
			$table->string('value', 255);
			$table->softDeletes();
		});
		DBHelper::createAuditTable('user_interest');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_interest');
		DBHelper::dropAuditTable('user_interest');
	}
}
