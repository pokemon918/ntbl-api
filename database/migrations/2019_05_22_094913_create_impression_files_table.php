<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateImpressionFilesTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('impression_files', function (Blueprint $table) {
			$table->increments('id');
			$table
				->integer('file_id')
				->unsigned()
				->default('0');
			$table
				->integer('impression_id')
				->unsigned()
				->default('0');

			$table
				->foreign('file_id')
				->references('id')
				->on('file');
			$table
				->foreign('impression_id')
				->references('id')
				->on('impression');
		});
		DBHelper::createAuditTable('impression_files');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('impression_files');
		DBHelper::dropAuditTable('impression_files');
	}
}
