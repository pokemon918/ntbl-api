<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddUniquePropertyToUserIdOnUserDemographicTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('user_demographic', function (Blueprint $table) {
			$table
				->integer('user_id')
				->nullable()
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
		Schema::table('user_demographic', function (Blueprint $table) {
			$table
				->integer('user_id')
				->nullable()
				->unsigned()
				->change();
		});
	}
}
