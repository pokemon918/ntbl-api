<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateRatingTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('rating', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('impression_id')->unsigned();
			$table->string('version', 16);
			$table->decimal('final_points', 12, 9)->default(0);
			$table->decimal('balance', 10, 9)->default(0.5);
			$table->decimal('length', 10, 9)->default(0.5);
			$table->decimal('intensity', 10, 9)->default(0.5);
			$table->decimal('terroir', 10, 9)->default(0.5);
			$table->decimal('complexity', 10, 9)->default(0.5);

			$table
				->foreign('impression_id')
				->references('id')
				->on('impression');
		});
		DBHelper::createAuditTable('rating');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('rating');
		DBHelper::dropAuditTable('rating');
	}
}
