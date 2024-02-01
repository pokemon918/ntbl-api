<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateFkeyTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('fkey', function (Blueprint $table) {
			$table->increments('id');
			$table->string('origin', 127);
			$table->string('subject_key', 127);
			$table->string('event_key', 127);
			$table->string('client_key', 127);
			$table->string('producer_key', 127);

			$table->index(['origin', 'subject_key', 'event_key', 'client_key', 'producer_key']);
			$table->index('origin');
			$table->index('subject_key');
			$table->index('client_key');
			$table->index('event_key');
			$table->index('producer_key');
		});

		DBHelper::createAuditTable('fkey');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('fkey');
		DBHelper::dropAuditTable('fkey');
	}
}
