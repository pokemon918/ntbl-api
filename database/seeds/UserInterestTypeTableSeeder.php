<?php
use Illuminate\Database\Seeder;

class UserInterestTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$interest_types = json_decode(
			file_get_contents(dirname(__FILE__) . '/data/user_interest_types.json'),
			true
		);
		foreach ($interest_types['keys'] as $interest_type) {
			$key = $interest_type;
			$name = ucfirst($interest_type);

			$interestTypeDB = DB::table('user_interest_type')
				->where('key', '=', $key)
				->first();

			if (empty($interestTypeDB)) {
				DB::table('user_interest_type')->insert([
					'key' => $key,
					'name' => $name,
				]);
			}
		}
	}
}
