<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateUserWineKnowledgeTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('user_wine_knowledge', function (Blueprint $table) {
			$table->increments('id');
			$table->string('title_key', 16);
			$table->timestamps();

			$table
				->integer('user_id')
				->nullable()
				->unsigned();

			$table
				->foreign('user_id')
				->references('id')
				->on('user');

			// todo : Deliberate Where Stand-Alone Education will Exist

			$table->index('created_at');
		});
		DBHelper::createAuditTable('user_wine_knowledge');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('user_wine_knowledge');
		DBHelper::dropAuditTable('user_wine_knowledge');
	}
}
