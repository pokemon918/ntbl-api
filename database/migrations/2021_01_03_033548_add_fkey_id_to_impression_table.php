<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class AddFkeyIdToImpressionTable extends Migration
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
				->integer('fkey_id')
				->unsigned()
				->nullable();

			$table
				->foreign('fkey_id')
				->nullable()
				->references('id')
				->on('fkey');

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
			$table->dropForeign(['fkey_id']);
			$table->dropColumn('fkey_id');
			DBHelper::dropColumnsFromAuditTable($table);
		});
	}
}
