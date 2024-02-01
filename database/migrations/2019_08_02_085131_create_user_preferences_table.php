<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserPreferencesTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_preferences', function (Blueprint $table) {
			$table->increments('id');

			$table
				->integer('lang')
				->nullable()
				->unsigned()
				->default(null);
			$table
				->foreign('lang')
				->references('id')
				->on('lang');

			$table
				->integer('currency')
				->nullable()
				->unsigned()
				->default(null);
			$table
				->foreign('currency')
				->references('id')
				->on('currency');

			$table
				->integer('user_id')
				->nullable()
				->unsigned();

			$table
				->foreign('user_id')
				->references('id')
				->on('user');

			$table->timestamps();
			$table->index('created_at');
		});
		DBHelper::createAuditTable('user_preferences');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_preferences');
		DBHelper::dropAuditTable('user_preferences');
	}
}
