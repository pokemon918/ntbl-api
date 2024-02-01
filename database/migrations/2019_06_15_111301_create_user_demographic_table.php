<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserDemographicTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_demographic', function (Blueprint $table) {
			$table->increments('id');

			$table
				->integer('address_id')
				->nullable()
				->unsigned()
				->default(null);
			$table->timestamps();

			$table
				->foreign('address_id')
				->references('id')
				->on('address');

			$table
				->integer('user_id')
				->nullable()
				->unsigned();

			$table
				->foreign('user_id')
				->references('id')
				->on('user');

			$table->index('created_at');
		});
		DBHelper::createAuditTable('user_demographic');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_demographic');
		DBHelper::dropAuditTable('user_demographic');
	}
}
