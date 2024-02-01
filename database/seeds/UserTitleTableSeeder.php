<?php

use Illuminate\Database\Seeder;
use App\Helpers\StringHelper;

class UserTitleTableSeeder extends Seeder
{
	public function __construct()
	{
		$this->refLength = config('app.identity.refLength');
	}

	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$titles = json_decode(
			file_get_contents(dirname(__FILE__) . '/data/user_titles.json'),
			true
		);

		foreach ($titles as $title) {
			$titleDB = DB::table('user_title')
				->where('key', '=', $title['key'])
				->first();

			if (empty($titleDB)) {
				DB::table('user_title')->insert([
					'key' => $title['key'],
					'name' => $title['name'],
				]);
			}
		}
	}
}
