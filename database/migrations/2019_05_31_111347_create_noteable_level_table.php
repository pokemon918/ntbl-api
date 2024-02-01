<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateNoteableLevelTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('noteable_level', function (Blueprint $table) {
			$table->increments('id');
			$table->string('name', 255);
			$table->integer('rank');
		});
		DBHelper::createAuditTable('noteable_level');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('noteable_level');
		DBHelper::dropAuditTable('noteable_level');
	}
}
