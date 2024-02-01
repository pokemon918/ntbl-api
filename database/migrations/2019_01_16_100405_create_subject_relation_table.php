<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateSubjectRelationTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('subject_relation', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('collection_id')->unsigned();
			$table->integer('tasting_id')->unsigned();
			$table->string('type')->default('impression');

			$table
				->foreign('collection_id')
				->references('id')
				->on('collection');

			$table
				->foreign('tasting_id')
				->references('id')
				->on('impression');
		});
		DBHelper::createAuditTable('subject_relation');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('subject_relation');
		DBHelper::dropAuditTable('subject_relation');
	}
}
