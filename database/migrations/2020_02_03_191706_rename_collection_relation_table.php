<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class RenameCollectionRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::rename('collection_relation', 'team_collection');
		DBHelper::renameAuditTable('collection_relation', 'team_collection');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::rename('team_collection', 'collection_relation');
		DBHelper::renameAuditTable('team_collection', 'collection_relation');
	}
}
