<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateRequestHistory extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('request_history', function (Blueprint $table) {
			$table->increments('id');
			$table->string('user_ref', 16);
			$table->string('who', 64)->unique();
			$table->timestamp('client_time');
			$table
				->integer('zone')
				->unsigned()
				->default(0);
			$table
				->string('signature', 128)
				->nullable()
				->unique()
				->default(null);
			$table->timestamps();
		});
		DBHelper::createAuditTable('request_history');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('request_history');
		DBHelper::dropAuditTable('request_history');
	}
}
