<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateFileTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('file', function (Blueprint $table) {
			$table->increments('id');
			$table->string('ref', 32)->unique();
			$table->string('path', 255);
			$table->string('mime_type', 32);
			$table->string('file_name', 128);
			$table->string('file_ext', 32);
			$table->integer('file_size')->unsigned();
			$table->timestamps();
			$table->softDeletes();

			$table->index('path');
			$table->index('mime_type');
			$table->index('file_name');
			$table->index('file_ext');
			$table->index('created_at');
			$table->index('deleted_at');
		});
		DBHelper::createAuditTable('file');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('file');
		DBHelper::dropAuditTable('file');
	}
}
