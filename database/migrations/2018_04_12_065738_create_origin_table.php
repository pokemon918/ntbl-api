<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateOriginTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('origin', function (Blueprint $table) {
			$table->increments('id');
			$table->string('client', 32);
			$table->string('version', 16);
			$table->string('flow', 16);
		});
		DBHelper::createAuditTable('origin');
	}
	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('origin');
		DBHelper::dropAuditTable('origin');
	}
}
