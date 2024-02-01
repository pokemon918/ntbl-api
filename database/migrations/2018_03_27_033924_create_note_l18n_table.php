<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateNoteL18nTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('note_l18n', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('note_id')->unsigned();
			$table->integer('l18n_id')->unsigned();
			$table->timestamps();
			$table->index('created_at');
		});
		DBHelper::createAuditTable('note_l18n');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('note_l18n');
		DBHelper::dropAuditTable('note_l18n');
	}
}
