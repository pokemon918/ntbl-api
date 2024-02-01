<?php
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class CreateFeedbackTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('feedback', function (Blueprint $table) {
			$table->increments('id');
			$table->string('name', 255);
			$table->string('email', 255);
			$table->text('message');
			$table->timestamps();
			$table->index('created_at');
		});
		DBHelper::createAuditTable('feedback');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::dropIfExists('feedback');
		DBHelper::dropAuditTable('feedback');
	}
}
