<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateLocalityTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('locality', function (Blueprint $table) {
			$table->increments('id');
			$table->string('name', 255);
			$table->string('postal_code', 15);
			$table
				->integer('country_id')
				->nullable()
				->unsigned()
				->default(null);

			$table
				->foreign('country_id')
				->references('id')
				->on('country');
		});
		DBHelper::createAuditTable('locality');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('locality');
		DBHelper::dropAuditTable('locality');
	}
}
