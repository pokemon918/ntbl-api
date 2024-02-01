<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddFoodPairingToIndividualTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('individual', function (Blueprint $table) {
			$table->text('food_pairing');
			DBHelper::applyColumnsToAuditTable($table);
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('individual', function (Blueprint $table) {
			$table->dropColumn('food_pairing');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
