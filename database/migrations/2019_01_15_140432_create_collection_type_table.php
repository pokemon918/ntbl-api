<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateCollectionTypeTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('collection_type', function (Blueprint $table) {
			$table->increments('id');
			$table->string('ref', 32)->unique();
		});
		DBHelper::createAuditTable('collection_type');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('collection_type');
		DBHelper::dropAuditTable('collection_type');
	}
}
