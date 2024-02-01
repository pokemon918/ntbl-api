<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class RenameRefToKeyOnCollectionTypeTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('collection_type', function (Blueprint $table) {
			$table->renameColumn('ref', 'key');
		});

		Schema::table('audit_collection_type', function (Blueprint $table) {
			$table->renameColumn('ref', 'key');
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('collection_type', function (Blueprint $table) {
			$table->renameColumn('key', 'ref');
		});

		Schema::table('audit_collection_type', function (Blueprint $table) {
			$table->renameColumn('key', 'ref');
		});
	}
}
