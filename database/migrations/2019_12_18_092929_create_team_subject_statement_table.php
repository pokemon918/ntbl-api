<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateTeamSubjectStatementTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('team_subject_statement', function (Blueprint $table) {
			$table->increments('id');
			$table->integer('team_id')->unsigned();
			$table->integer('collection_impression_relation_id')->unsigned();
			$table
				->string('marked_impression', 32)
				->nullable()
				->default(null);
			$table->boolean('flag')->default(false);
			$table->boolean('requested')->default(false);
			$table
				->string('statement', 32)
				->nullable()
				->default(null);
			$table
				->string('extra_a', 32)
				->nullable()
				->default(null);
			$table
				->string('extra_b', 32)
				->nullable()
				->default(null);
			$table
				->string('extra_c', 32)
				->nullable()
				->default(null);
			$table
				->string('extra_d', 32)
				->nullable()
				->default(null);
			$table
				->string('extra_e', 32)
				->nullable()
				->default(null);

			$table
				->foreign('team_id')
				->references('id')
				->on('team');
			$table
				->foreign('collection_impression_relation_id')
				->references('id')
				->on('collection_impression_relation');
		});
		DBHelper::createAuditTable('team_subject_statement');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('team_subject_statement');
		DBHelper::dropAuditTable('team_subject_statement');
	}
}
