<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateChargifyEventsTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('chargify_events', function (Blueprint $table) {
			$table->increments('id');
			$table
				->integer('webhook_id')
				->unsigned()
				->unique();
			$table->string('event_type');
			DBHelper::addJsonFieldToTable('event_body', $table);
			$table->timestamp('read_at')->nullable();
			$table->timestamps();
		});
		DBHelper::createAuditTable('chargify_events');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('chargify_events');
		DBHelper::dropAuditTable('chargify_events');
	}
}
