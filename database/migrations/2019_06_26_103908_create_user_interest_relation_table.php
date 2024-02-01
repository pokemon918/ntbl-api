<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserInterestRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_interest_relation', function (Blueprint $table) {
			$table->increments('id');
			$table->string('ref', 16)->unique();
			$table->integer('user_id')->unsigned();
			$table->integer('user_interest_id')->unsigned();
			$table->integer('user_interest_type_id')->unsigned();
			$table->softDeletes();

			$table
				->foreign('user_id')
				->references('id')
				->on('user');
			$table
				->foreign('user_interest_id')
				->references('id')
				->on('user_interest');
			$table
				->foreign('user_interest_type_id')
				->references('id')
				->on('user_interest_type');
		});
		DBHelper::createAuditTable('user_interest_relation');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_interest_relation');
		DBHelper::dropAuditTable('user_interest_relation');
	}
}
