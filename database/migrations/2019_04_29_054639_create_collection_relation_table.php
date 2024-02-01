<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateCollectionRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('collection_relation', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('collection_id')->unsigned();
			$table->integer('team_id')->unsigned();
			$table->string('type')->default('host');

			$table
				->foreign('collection_id')
				->references('id')
				->on('collection');
			$table
				->foreign('team_id')
				->references('id')
				->on('team');
		});
		DBHelper::createAuditTable('collection_relation');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('collection_relation');
		DBHelper::dropAuditTable('collection_relation');
	}
}
