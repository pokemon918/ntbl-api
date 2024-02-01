<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateIdentityTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('identity', function (Blueprint $table) {
			$table->increments('id');
			$table->string('email', 255)->unique();
			$table->string('hpass', 255);
			$table->string('salt', 255);
			$table->integer('iterations')->unsigned();
			$table->string('reset_token', 64);
			$table
				->integer('user_id')
				->unsigned()
				->unique()
				->default(null);
			$table->timestamp('created_ct')->nullable();
			$table->timestamp('updated_ct')->nullable();
			$table->timestamp('deleted_ct')->nullable();
			$table->timestamps();
			$table->softDeletes();

			$table
				->foreign('user_id')
				->references('id')
				->on('user');

			$table->index('created_at');
			$table->index('deleted_at');
			$table->index('created_ct');
			$table->index('updated_ct');
			$table->index('deleted_ct');
		});
		DBHelper::createAuditTable('identity');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('identity');
		DBHelper::dropAuditTable('identity');
	}
}
