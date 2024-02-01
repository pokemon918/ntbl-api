<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateCollectionTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('collection', function (Blueprint $table) {
			$table->increments('id');
			$table->string('ref', 32)->unique();
			$table->string('name', 255);
			$table->text('description');
			$table->dateTime('start_date');
			$table->dateTime('end_date');
			$table->string('owner_ref', 64)->default('0');
			DBHelper::addJsonFieldToTable('metadata', $table);

			$table
				->integer('collection_type_id')
				->unsigned()
				->default('0');
			$table
				->integer('collection_access_type_id')
				->unsigned()
				->default('0');
			$table
				->string('profile_pic', 16)
				->unique()
				->nullable();
			$table->integer('collection_type_id_subtype')->unsigned();
			$table->timestamp('created_ct')->nullable();
			$table->timestamp('updated_ct')->nullable();
			$table->timestamp('deleted_ct')->nullable();
			$table->timestamps();
			$table->softDeletes();

			$table
				->foreign('collection_type_id')
				->references('id')
				->on('collection_type');

			$table
				->foreign('collection_access_type_id')
				->references('id')
				->on('collection_access_type');

			$table
				->foreign('collection_type_id_subtype')
				->references('id')
				->on('collection_type');

			$table->index('created_at');
			$table->index('deleted_at');
			$table->index('created_ct');
			$table->index('updated_ct');
			$table->index('deleted_ct');
		});

		DBHelper::createAuditTable('collection');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('collection');
		DBHelper::dropAuditTable('collection');
	}
}
