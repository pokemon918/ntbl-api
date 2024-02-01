<?php

use Illuminate\Database\Seeder;

class NoteableLevelTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$levels = [
			'basic' => 1,
			'enthusiast' => 2,
			'expert' => 3,
			'specialist' => 4,
		];

		foreach ($levels as $key => $value) {
			$name = ucfirst($key);
			$level = DB::table('noteable_level')
				->where('name', '=', $name)
				->first();

			if (!empty($level)) {
				DB::table('noteable_level')->insert([
					'name' => $name,
					'rank' => $value,
				]);
			}
		}
	}
}
