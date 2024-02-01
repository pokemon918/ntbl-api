<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserContactTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_contact', function (Blueprint $table) {
			$table->increments('id');
			$table->string('phone_prefix', 5);
			$table->string('phone', 25);
			$table->string('linkedin', 150);
			$table->string('twitter', 150);

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
		DBHelper::createAuditTable('user_contact');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_contact');
		DBHelper::dropAuditTable('user_contact');
	}
}
