<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddUniquePropertyToImpressionIdOnRatingTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('rating', function (Blueprint $table) {
			$table
				->integer('impression_id')
				->unsigned()
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
		Schema::table('rating', function (Blueprint $table) {
			$table
				->integer('impression_id')
				->unsigned()
				->change();
		});
	}
}
