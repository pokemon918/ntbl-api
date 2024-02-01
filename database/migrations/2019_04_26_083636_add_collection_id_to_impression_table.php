<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddCollectionIdToImpressionTable extends Migration
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
				->integer('collection_id')
				->nullable()
				->unsigned();
			$table
				->foreign('collection_id')
				->references('id')
				->on('collection');
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
			$table->dropForeign(['collection_id']);
			$table->dropColumn('collection_id');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
