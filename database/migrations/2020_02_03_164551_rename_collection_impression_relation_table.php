<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class RenameCollectionImpressionRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::rename('collection_impression_relation', 'collection_impression');
		DBHelper::renameAuditTable('collection_impression_relation', 'collection_impression');

		Schema::table('team_subject_statement', function (Blueprint $table) {
			$table->renameColumn('collection_impression_relation_id', 'collection_impression_id');
		});

		Schema::table('audit_team_subject_statement', function (Blueprint $table) {
			$table->renameColumn('collection_impression_relation_id', 'collection_impression_id');
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::rename('collection_impression', 'collection_impression_relation');
		DBHelper::renameAuditTable('collection_impression', 'collection_impression_relation');

		Schema::table('team_subject_statement', function (Blueprint $table) {
			$table->renameColumn('collection_impression_id', 'collection_impression_relation_id');
		});

		Schema::table('audit_team_subject_statement', function (Blueprint $table) {
			$table->renameColumn('collection_impression_id', 'collection_impression_relation_id');
		});
	}
}
