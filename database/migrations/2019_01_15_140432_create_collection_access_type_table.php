<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateCollectionAccessTypeTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('collection_access_type', function (Blueprint $table) {
			$table->increments('id');
			$table->string('key', 32)->unique();
			$table->string('name', 32);
		});
		DBHelper::createAuditTable('collection_access_type');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('collection_access_type');
		DBHelper::dropAuditTable('collection_access_type');
	}
}
