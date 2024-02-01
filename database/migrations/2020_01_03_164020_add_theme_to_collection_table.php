<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddThemeToCollectionTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('collection', function (Blueprint $table) {
			$table->string('theme', 128)->default('');
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
		Schema::table('collection', function (Blueprint $table) {
			$table->dropColumn('theme');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
