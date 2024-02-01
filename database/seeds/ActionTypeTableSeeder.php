<?php

use Illuminate\Database\Seeder;

class ActionTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$join = DB::table('action_type')
			->where('key', '=', 'join')
			->first();

		$invite = DB::table('action_type')
			->where('key', '=', 'invite')
			->first();

		if (empty($join)) {
			DB::table('action_type')->insert([
				'name' => 'Join',
				'key' => 'join',
			]);
		}

		if (empty($invite)) {
			DB::table('action_type')->insert([
				'name' => 'Invite',
				'key' => 'invite',
			]);
		}
	}
}
