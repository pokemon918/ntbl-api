<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserSubscriptionTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_subscription', function (Blueprint $table) {
			$table->increments('id');
			$table
				->integer('subscription_id')
				->unique()
				->unsigned()
				->nullable()
				->default(null);
			$table->integer('user_id')->unsigned();
			$table->integer('plan_id')->unsigned();
			$table->string('status', 32);
			$table->string('future_plan', 32);
			$table->dateTime('start_date')->nullable();
			$table->dateTime('end_date')->nullable();
			$table->dateTime('canceled_at')->nullable();
			$table->dateTime('delayed_cancel_at')->nullable();
			$table
				->integer('voucher_id')
				->unsigned()
				->nullable()
				->default(null);
			$table->timestamps();
			$table->softDeletes();

			$table
				->foreign('user_id')
				->references('id')
				->on('user');

			$table
				->foreign('plan_id')
				->references('id')
				->on('subscription_plan');

			// todo : foreign voucher
		});
		DBHelper::createAuditTable('user_subscription');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_subscription');
		DBHelper::dropAuditTable('user_subscription');
	}
}
