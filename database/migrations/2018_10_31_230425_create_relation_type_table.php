<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateRelationTypeTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('relation_type', function (Blueprint $table) {
			$table->increments('id');
			$table->string('name', 255)->unique();
			$table->string('key', 32)->unique();
		});
		DBHelper::createAuditTable('relation_type');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('relation_type');
		DBHelper::dropAuditTable('relation_type');
	}
}
