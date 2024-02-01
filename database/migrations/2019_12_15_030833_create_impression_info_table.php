<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateImpressionInfoTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('impression_info', function (Blueprint $table) {
			$table->bigIncrements('id');
			$table->integer('impression_id')->unsigned();
			$table->string('field', 64);
			$table->string('info', 64);
			$table
				->decimal('value', 16, 8)
				->nullable()
				->default(null);

			$table
				->foreign('impression_id')
				->references('id')
				->on('impression');
		});
		DBHelper::createAuditTable('impression_info');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('impression_info');
		DBHelper::dropAuditTable('impression_info');
	}
}
