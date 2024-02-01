<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateCollectionFeaturedTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('collection_featured', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('collection_id')->unsigned();
			$table->string('meta_info', 255);
			$table->string('sub_header', 255);
			$table->dateTime('feature_start')->nullable();
			$table->dateTime('feature_end')->nullable();

			$table
				->foreign('collection_id')
				->references('id')
				->on('collection');

			// todo : admin user types can only add to site-wide featured events
		});
		DBHelper::createAuditTable('collection_featured');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('collection_featured');
		DBHelper::dropAuditTable('collection_featured');
	}
}
