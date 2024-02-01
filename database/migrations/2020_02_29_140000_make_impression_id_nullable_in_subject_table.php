<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class MakeImpressionIdNullableInSubjectTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('subject', function (Blueprint $table) {
			$table
				->integer('impression_id')
				->unsigned()
				->nullable()
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
		Schema::table('subject', function (Blueprint $table) {
			$table
				->integer('impression_id')
				->unsigned()
				->change();
		});
	}
}
