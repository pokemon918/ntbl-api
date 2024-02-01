<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateAddressTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('address', function (Blueprint $table) {
			$table->increments('id');
			$table->string('info1', 255);
			$table->string('info2', 255);
			$table->string('region', 255);
			$table
				->integer('country_id')
				->nullable()
				->unsigned()
				->default(null);
			$table
				->integer('locality_id')
				->nullable()
				->unsigned()
				->default(null);
			$table->timestamps();

			$table
				->foreign('country_id')
				->references('id')
				->on('country');
			$table
				->foreign('locality_id')
				->references('id')
				->on('locality');

			$table->index('created_at');
		});
		DBHelper::createAuditTable('address');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('address');
		DBHelper::dropAuditTable('address');
	}
}
