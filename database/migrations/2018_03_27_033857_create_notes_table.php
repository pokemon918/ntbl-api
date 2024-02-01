<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateNotesTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('note', function (Blueprint $table) {
			$table->increments('id');
			$table->string('key', 255)->unique();
			$table->boolean('deprecated')->default(false);
			$table->timestamps();
			$table->index('created_at');
		});
		DBHelper::createAuditTable('note');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('note');
		DBHelper::dropAuditTable('note');
	}
}
