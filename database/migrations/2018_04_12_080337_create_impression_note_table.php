<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateImpressionNoteTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('impression_note', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('impression_id')->unsigned();
			$table->integer('note_id')->unsigned();
			$table->string('type', 32);

			$table
				->foreign('impression_id')
				->references('id')
				->on('impression');
			$table
				->foreign('note_id')
				->references('id')
				->on('note');
		});
		DBHelper::createAuditTable('impression_note');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('impression_note');
		DBHelper::dropAuditTable('impression_note');
	}
}
