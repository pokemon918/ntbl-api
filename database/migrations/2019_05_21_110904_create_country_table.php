<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateCountryTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('country', function (Blueprint $table) {
			$table->increments('id');
			$table->string('name', 150);
			$table->string('alpha2', 16);
			$table->string('alpha3', 16);
			$table->string('country_code', 16);
			$table->string('iso_3166_2', 150);
			$table->string('region', 150);
			$table->string('sub_region', 150);
			$table->string('intermediate_region', 150);
			$table->string('region_code', 16);
			$table->string('sub_region_code', 16);
			$table->string('intermediate_region_code', 16);
		});
		DBHelper::createAuditTable('country');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('country');
		DBHelper::dropAuditTable('country');
	}
}
