<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateSubscriptionPlanTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('subscription_plan', function (Blueprint $table) {
			$table->increments('id');
			$table->string('name', 255)->unique();
			$table->string('key', 32)->unique();
			$table->integer('weight');
		});
		DBHelper::createAuditTable('subscription_plan');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('subscription_plan');
		DBHelper::dropAuditTable('subscription_plan');
	}
}
