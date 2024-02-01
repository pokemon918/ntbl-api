<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateVoucherTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('voucher', function (Blueprint $table) {
			$table->increments('id');
			$table
				->string('parent_coupon', 32)
				->nullable()
				->default(null);
			$table->string('code', 32)->unique();
			$table->string('plan', 32);
			$table->string('type', 32);
			$table
				->integer('usage_limit')
				->nullable()
				->default(1);
			$table->integer('valid_days')->default(180);
			$table->timestamps();
		});
		DBHelper::createAuditTable('voucher');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('voucher');
		DBHelper::dropAuditTable('voucher');
	}
}
