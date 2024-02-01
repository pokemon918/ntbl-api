<?php

use Illuminate\Database\Seeder;

class TeamAccessTypeOverrideSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		/*
            This Seeder overrides the initial seeds "planted" by the TeamAccessTypeTableSeeder
            The objective is to change the team_access_type keys to open|apply|exclusive (Previously open|hidden|private)
            For more info please check - (team/1266) card
        */

		$hidden = DB::table('team_access_type')->where('key', '=', 'hidden');

		$private = DB::table('team_access_type')->where('key', '=', 'private');

		if (!empty($hidden)) {
			$hidden->update([
				'key' => 'apply',
				'name' => 'Apply',
			]);
		}

		if (!empty($private)) {
			$private->update([
				'key' => 'exclusive',
				'name' => 'Exclusive',
			]);
		}
	}
}
