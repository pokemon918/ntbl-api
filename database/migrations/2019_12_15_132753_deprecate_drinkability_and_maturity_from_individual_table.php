<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class DeprecateDrinkabilityAndMaturityFromIndividualTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('individual', function (Blueprint $table) {
			$table->renameColumn('drinkability', 'drinkability_legacy');
			$table->renameColumn('maturity', 'maturity_legacy');
		});

		Schema::table('audit_individual', function (Blueprint $table) {
			$table->renameColumn('drinkability', 'drinkability_legacy');
			$table->renameColumn('maturity', 'maturity_legacy');
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('individual', function (Blueprint $table) {});

		Schema::table('audit_individual', function (Blueprint $table) {});
	}
}
