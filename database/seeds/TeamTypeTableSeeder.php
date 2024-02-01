<?php

use Illuminate\Database\Seeder;

class TeamTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$types = ['traditional', 'contest', 'division'];

		foreach ($types as $type) {
			$typeDB = DB::table('team_type')
				->where('key', '=', $type)
				->first();

			if (empty($typeDB)) {
				DB::table('team_type')->insert([
					'key' => $type,
				]);
			}
		}
	}
}
