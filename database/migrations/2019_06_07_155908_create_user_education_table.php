<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserEducationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_education', function (Blueprint $table) {
			$table->increments('id');
			$table->string('ref', 32)->unique();
			$table->integer('user_id')->unsigned();
			$table->string('school');
			$table->text('description');
			$table->text('achievement');

			$table
				->integer('country_id')
				->nullable()
				->unsigned()
				->default(null);

			$table
				->boolean('completed')
				->nullable()
				->default(null);

			$table
				->year('year')
				->nullable()
				->default(null);

			$table->timestamps();
			$table->softDeletes();

			$table
				->foreign('user_id')
				->references('id')
				->on('user');

			$table
				->foreign('country_id')
				->references('id')
				->on('country');

			$table->index('created_at');
			$table->index('deleted_at');
		});
		DBHelper::createAuditTable('user_education');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_education');
		DBHelper::dropAuditTable('user_education');
	}
}
