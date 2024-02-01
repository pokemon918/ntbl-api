<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserInterestTypeTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_interest_type', function (Blueprint $table) {
			$table->increments('id');
			$table->string('key', 32)->unique();
			$table->string('name', 255);
		});
		DBHelper::createAuditTable('user_interest_type');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_interest_type');
		DBHelper::dropAuditTable('user_interest_type');
	}
}
