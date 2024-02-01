<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use App\Helpers\DBHelper;

class UpdateRequestHistoryTable extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		// api/2403
		// https://bitbucket.org/mathiasrw/ntbl-api/pull-requests/495#comment-133168793
		Schema::table('request_history', function (Blueprint $table) {
			$table->dropColumn('id');
			$table->dropColumn('updated_at');
			$table->string('url', 1024);
			$table->index('url');
			$table->index('user_ref');
			$table->index('client_time');
			$table->index('created_at');
			$table->index('zone');
		});
		DBHelper::dropAuditTable('request_history');
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::table('request_history', function (Blueprint $table) {
			$table->increments('id');
			$table->timestamp('updated_at');
			$table->dropIndex(['user_ref']);
			$table->dropIndex(['client_time']);
			$table->dropIndex(['created_at']);
			$table->dropIndex(['zone']);
			$table->dropIndex(['url']);
			$table->dropColumn('url');
		});
		DBHelper::createAuditTable('request_history');
	}
}
