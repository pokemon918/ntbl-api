<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddIndexesToTeamCollection extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::table('team_collection', function (Blueprint $table) {
			// Card Expectation
			$table->index('type');
			$table->unique(['collection_id', 'team_id', 'type']);
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		// Drop composite unique bug : https://github.com/laravel/framework/issues/13873#issuecomment-326138123
		Schema::table('team_collection', function (Blueprint $table) {
			// Add missing manual foreign index from bug described above
			$table->index('team_id', 'team_collection_team_id_foreign');
			$table->index('collection_id', 'team_collection_collection_id_foreign');

			// Card Expectation
			$table->dropUnique(['collection_id', 'team_id', 'type']);
			$table->dropIndex(['type']);

			// Drop foreign so we could remove the indexes
			$table->dropForeign(['team_id']);
			$table->dropForeign(['collection_id']);

			// Drop indexes for re-migration
			$table->dropIndex('team_collection_team_id_foreign');
			$table->dropIndex('team_collection_collection_id_foreign');

			// Restore foreign keys as expected in this migration and in 2019_04_29_054639_create_collection_relation_table.php
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
}
