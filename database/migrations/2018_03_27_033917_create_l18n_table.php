<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateL18nTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('l18n', function (Blueprint $table) {
			$table->increments('id');
			$table->string('ref', 16)->unique();
			$table->integer('lang_id')->unsigned();
			$table->text('val');
			$table
				->foreign('lang_id')
				->references('id')
				->on('lang');
			$table->timestamps();
			$table->index('created_at');
		});
		DBHelper::createAuditTable('l18n');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('l18n');
		DBHelper::dropAuditTable('l18n');
	}
}
