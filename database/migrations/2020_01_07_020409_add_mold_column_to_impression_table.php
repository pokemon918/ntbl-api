<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddMoldColumnToImpressionTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('impression', function (Blueprint $table) {
			$table
				->string('mold', 32)
				->nullable()
				->default(null);
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
		Schema::table('impression', function (Blueprint $table) {
			$table->dropColumn('mold');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
