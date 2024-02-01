<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateImpressionInfoValueType extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('impression_info_value_type', function (Blueprint $table) {
			$table->increments('id');
			$table->string('key', 64)->unique();
			$table->string('name', 255);
		});
		DBHelper::createAuditTable('impression_info_value_type');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('impression_info_value_type');
		DBHelper::dropAuditTable('impression_info_value_type');
	}
}
