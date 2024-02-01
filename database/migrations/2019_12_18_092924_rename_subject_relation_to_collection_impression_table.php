<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class RenameSubjectRelationToCollectionImpressionTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::rename('subject_relation', 'collection_impression_relation');
		DBHelper::renameAuditTable('subject_relation', 'collection_impression_relation');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::rename('collection_impression_relation', 'subject_relation');
		DBHelper::renameAuditTable('collection_impression_relation', 'subject_relation');
	}
}
