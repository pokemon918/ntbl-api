<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateLifecycleTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('lifecycle', function (Blueprint $table) {
			$table->increments('id');
			$table->string('status', 32);
			$table->index('status');
		});
		DBHelper::createAuditTable('lifecycle');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('lifecycle');
		DBHelper::dropAuditTable('lifecycle');
	}
}
