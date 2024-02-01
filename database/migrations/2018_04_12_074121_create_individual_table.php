<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateIndividualTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('individual', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('impression_id')->unsigned();
			$table->text('summary_wine');
			$table->text('summary_personal');
			$table
				->decimal('drinkability', 10, 9)
				->nullable()
				->default(null);
			$table
				->decimal('maturity', 10, 9)
				->nullable()
				->default(null);
			$table->string('location', 64);
			$table
				->decimal('lat', 16, 13)
				->nullable()
				->default(null);
			$table
				->decimal('long', 16, 13)
				->nullable()
				->default(null);
			$table
				->foreign('impression_id')
				->references('id')
				->on('impression');
		});
		DBHelper::createAuditTable('individual');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('individual');
		DBHelper::dropAuditTable('individual');
	}
}
