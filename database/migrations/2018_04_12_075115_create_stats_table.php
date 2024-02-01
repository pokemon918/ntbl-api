<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateStatsTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('stats', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('impression_id')->unsigned();
			$table->string('event', 32);
			$table->float('value');
			$table->timestamp('created_ct')->nullable();
			$table->timestamp('updated_ct')->nullable();
			$table->timestamp('deleted_ct')->nullable();
			$table->timestamps();
			$table->softDeletes();

			$table
				->foreign('impression_id')
				->references('id')
				->on('impression');

			$table->index('created_at');
			$table->index('deleted_at');
			$table->index('created_ct');
			$table->index('updated_ct');
			$table->index('deleted_ct');
		});
		DBHelper::createAuditTable('stats');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('stats');
		DBHelper::dropAuditTable('stats');
	}
}
