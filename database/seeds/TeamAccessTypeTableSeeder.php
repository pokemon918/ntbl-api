<?php

use Illuminate\Database\Seeder;

class TeamAccessTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		// 'open', 'hidden', 'private'

		$open = DB::table('team_access_type')
			->where('id', '=', 1)
			->first();

		$hidden = DB::table('team_access_type')
			->where('id', '=', 2)
			->first();

		$private = DB::table('team_access_type')
			->where('id', '=', 3)
			->first();

		if (empty($open)) {
			DB::table('team_access_type')->insert([
				'id' => 1,
				'key' => 'open',
				'name' => 'Open',
			]);
			DB::table('team_access_type')->where('id', 1);
		}

		if (empty($hidden)) {
			DB::table('team_access_type')->insert([
				'id' => 2,
				'key' => 'hidden',
				'name' => 'Hidden',
			]);
			DB::table('team_access_type')->where('id', 2);
		}

		if (empty($private)) {
			DB::table('team_access_type')->insert([
				'id' => 3,
				'key' => 'private',
				'name' => 'Private',
			]);
			DB::table('team_access_type')->where('id', 3);
		}
	}
}
