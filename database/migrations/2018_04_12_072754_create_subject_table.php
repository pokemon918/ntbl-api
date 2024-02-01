<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateSubjectTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('subject', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('impression_id')->unsigned();
			$table->string('name', 255);
			$table->string('producer', 255);
			$table->string('country', 64);
			$table->string('region', 255);
			$table->string('vintage', 64);
			$table->string('grape', 255);
			$table->decimal('price', 13, 4)->default(0);
			$table->string('currency', 16)->default('USD'); //this field is temporary and subject for improvement
			$table->string('clean_key', 64)->nullable();
			$table->string('producer_key', 64)->nullable();
			$table->string('country_key', 64)->nullable();
			$table->string('region_key', 64)->nullable();
			$table->timestamp('created_ct')->nullable();
			$table->timestamp('updated_ct')->nullable();
			$table->timestamp('deleted_ct')->nullable();
			$table->timestamps();
			$table->softDeletes();

			$table
				->foreign('impression_id')
				->references('id')
				->on('impression');

			// Add index for all non-key column
			$table->index('name');
			$table->index('producer');
			$table->index('country');
			$table->index('region');
			$table->index('vintage');
			$table->index('grape');
			$table->index('created_at');
			$table->index('deleted_at');
			$table->index('created_ct');
			$table->index('updated_ct');
			$table->index('deleted_ct');
		});
		DBHelper::createAuditTable('subject');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('subject');
		DBHelper::dropAuditTable('subject');
	}
}
