<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user', function (Blueprint $table) {
			$table->increments('id');
			$table->string('ref', 16)->unique();
			$table->string('name', 255);
			$table
				->string('handle', 255)
				->unique()
				->nullable();
			$table->dateTime('birth_date')->nullable();
			$table->dateTime('gdpr_consent')->nullable();
			$table
				->string('profile_pic', 16)
				->unique()
				->nullable();
			$table->boolean('used_trial')->default(false);
			$table
				->integer('customer_id')
				->unsigned()
				->nullable()
				->default(null);
			$table->timestamp('created_ct')->nullable();
			$table->timestamp('updated_ct')->nullable();
			$table->timestamp('deleted_ct')->nullable();
			$table->timestamps();
			$table->softDeletes();

			$table->index('created_at');
			$table->index('deleted_at');
			$table->index('created_ct');
			$table->index('updated_ct');
			$table->index('deleted_ct');
		});
		DBHelper::createAuditTable('user');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user');
		DBHelper::dropAuditTable('user');
	}
}
