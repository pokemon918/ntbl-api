<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class RenameProfilePicColumns extends Migration
{
	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		// User
		Schema::table('user', function (Blueprint $table) {
			$table->renameColumn('profile_pic', 'avatar');
		});

		Schema::table('audit_user', function (Blueprint $table) {
			$table->renameColumn('profile_pic', 'avatar');
		});

		// Collection
		Schema::table('collection', function (Blueprint $table) {
			$table->renameColumn('profile_pic', 'avatar');
		});

		Schema::table('audit_collection', function (Blueprint $table) {
			$table->renameColumn('profile_pic', 'avatar');
		});

		// Team
		Schema::table('team', function (Blueprint $table) {
			$table->renameColumn('profile_pic', 'avatar');
		});

		Schema::table('audit_team', function (Blueprint $table) {
			$table->renameColumn('profile_pic', 'avatar');
		});
	}

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		// User
		Schema::table('user', function (Blueprint $table) {
			$table->renameColumn('avatar', 'profile_pic');
		});

		Schema::table('audit_user', function (Blueprint $table) {
			$table->renameColumn('avatar', 'profile_pic');
		});

		// Collection
		Schema::table('collection', function (Blueprint $table) {
			$table->renameColumn('avatar', 'profile_pic');
		});

		Schema::table('audit_collection', function (Blueprint $table) {
			$table->renameColumn('avatar', 'profile_pic');
		});

		// Team
		Schema::table('team', function (Blueprint $table) {
			$table->renameColumn('avatar', 'profile_pic');
		});

		Schema::table('audit_team', function (Blueprint $table) {
			$table->renameColumn('avatar', 'profile_pic');
		});
	}
}
