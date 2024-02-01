<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateLangTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('lang', function (Blueprint $table) {
			$table->increments('id');
			$table->string('key', 32)->unique();
			$table->string('name', 128);
			$table->timestamps();
			$table->index('created_at');
		});
		DBHelper::createAuditTable('lang');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('lang');
		DBHelper::dropAuditTable('lang');
	}
}
