<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateImpressionTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('impression', function (Blueprint $table) {
			$table->increments('id');
			$table->string('ref', 32)->unique();
			$table
				->integer('lifecycle_id')
				->unsigned()
				->default('0');
			$table
				->integer('origin_id')
				->unsigned()
				->default('0');
			$table->string('owner_ref', 64)->default('0');
			$table
				->integer('impression_type_id')
				->unsigned()
				->default('0');
			DBHelper::addJsonFieldToTable('metadata', $table);
			$table->timestamp('created_ct')->nullable();
			$table->timestamp('updated_ct')->nullable();
			$table->timestamp('deleted_ct')->nullable();
			$table->timestamps();
			$table->softDeletes();

			$table
				->foreign('lifecycle_id')
				->references('id')
				->on('lifecycle');
			$table
				->foreign('origin_id')
				->references('id')
				->on('origin');
			$table
				->foreign('impression_type_id')
				->references('id')
				->on('impression_type');

			$table->index('created_at');
			$table->index('deleted_at');
			$table->index('created_ct');
			$table->index('updated_ct');
			$table->index('deleted_ct');
		});
		DBHelper::createAuditTable('impression');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('impression');
		DBHelper::dropAuditTable('impression');
	}
}
