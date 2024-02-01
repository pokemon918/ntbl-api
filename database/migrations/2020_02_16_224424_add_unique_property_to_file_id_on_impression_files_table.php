<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddUniquePropertyToFileIdOnImpressionFilesTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('impression_files', function (Blueprint $table) {
			$table
				->integer('file_id')
				->unsigned()
				->default('0')
				->unique()
				->change();
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('impression_files', function (Blueprint $table) {
			$table
				->integer('file_id')
				->unsigned()
				->default('0')
				->change();
		});
	}
}
