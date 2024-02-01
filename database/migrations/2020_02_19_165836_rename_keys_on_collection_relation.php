<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class RenameKeysOnCollectionRelation extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('team_collection', function (Blueprint $table) {
			// Remove foreign keys with the old table name
			$table->dropForeign('collection_relation_collection_id_foreign');
			$table->dropForeign('collection_relation_team_id_foreign');

			// Restore foreign keys , with the new table name , and as expected in migration 2019_04_29_054639_create_collection_relation_table.php
			$table
				->foreign('collection_id')
				->references('id')
				->on('collection');
			$table
				->foreign('team_id')
				->references('id')
				->on('team');
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		// One way migration, Table rename in migration doesn't rename foreign keys 2020_02_03_191706_rename_collection_relation_table.php
	}
}
