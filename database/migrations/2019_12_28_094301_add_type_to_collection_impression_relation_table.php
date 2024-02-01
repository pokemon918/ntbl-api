<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddTypeToCollectionImpressionRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('collection_impression_relation', function (Blueprint $table) {
			$table->string('type', 32)->default('active');
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
		Schema::table('collection_impression_relation', function (Blueprint $table) {
			$table->dropColumn('type');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
