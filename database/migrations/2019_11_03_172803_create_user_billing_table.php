<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserBillingTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_billing', function (Blueprint $table) {
			$table->increments('id');
			$table
				->integer('user_id')
				->unsigned()
				->unique();
			$table->string('portal_link');
			$table->dateTime('expires_at')->nullable();
			$table->timestamps();
			$table
				->foreign('user_id')
				->references('id')
				->on('user');
		});
		DBHelper::createAuditTable('user_billing');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_billing');
		DBHelper::dropAuditTable('user_billing');
	}
}
