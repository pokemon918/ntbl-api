<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class UpdateCollectionTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('collection', function (Blueprint $table) {
			$table
				->dateTime('start_date')
				->nullable()
				->default(null)
				->change();
			$table
				->dateTime('end_date')
				->nullable()
				->default(null)
				->change();
			$table->index('start_date');
			$table->index('end_date');
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('collection', function (Blueprint $table) {
			$table
				->dateTime('start_date')
				->nullable(false)
				->change();
			$table
				->dateTime('end_date')
				->nullable(false)
				->change();
			$table->dropIndex(['start_date']);
			$table->dropIndex(['end_date']);
		});
	}
}
