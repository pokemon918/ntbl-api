<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateCurrencyTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('currency', function (Blueprint $table) {
			$table->increments('id');
			$table->string('key', 32)->unique();
			$table->string('name', 255);
		});
		DBHelper::createAuditTable('currency');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('currency');
		DBHelper::dropAuditTable('currency');
	}
}
