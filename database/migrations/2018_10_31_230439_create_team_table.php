<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateTeamTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('team', function (Blueprint $table) {
			$table->increments('id');
			$table->string('name', 255);
			$table->string('ref', 32)->unique();
			$table
				->string('handle', 255)
				->unique()
				->nullable();
			$table->text('description');
			$table
				->integer('team_access_type_id')
				->unsigned()
				->default('0');
			$table
				->string('profile_pic', 16)
				->unique()
				->nullable();

			$table->string('city', 255);
			$table->string('country', 3);
			$table->timestamp('created_ct')->nullable();
			$table->timestamp('updated_ct')->nullable();
			$table->timestamp('deleted_ct')->nullable();
			$table->timestamps();
			$table->softDeletes();

			$table
				->foreign('team_access_type_id')
				->references('id')
				->on('team_access_type');

			$table->index('created_at');
			$table->index('deleted_at');
			$table->index('created_ct');
			$table->index('updated_ct');
			$table->index('deleted_ct');
		});
		DBHelper::createAuditTable('team');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('team');
		DBHelper::dropAuditTable('team');
	}
}
