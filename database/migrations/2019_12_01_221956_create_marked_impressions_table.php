<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateMarkedImpressionsTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('marked_impressions', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('user_id')->unsigned();
			$table->integer('impression_id')->unsigned();
			$table->timestamps();
			$table
				->foreign('user_id')
				->references('id')
				->on('user');
			$table
				->foreign('impression_id')
				->references('id')
				->on('impression');
			$table->unique(['user_id', 'impression_id']);
		});
		DBHelper::createAuditTable('marked_impressions');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('marked_impressions');
		DBHelper::dropAuditTable('marked_impressions');
	}
}
