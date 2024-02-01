<?php

use Illuminate\Database\Seeder;
use App\Helpers\StringHelper;

class ImpressionInfoValueTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$valueTypes = json_decode(
			file_get_contents(dirname(__FILE__) . '/data/impression_info_value_types.json'),
			true
		);

		foreach ($valueTypes as $valueType) {
			$valueTypeDB = DB::table('impression_info_value_type')
				->where('key', '=', $valueType)
				->first();

			if (empty($valueTypeDB)) {
				DB::table('impression_info_value_type')->insert([
					'key' => $valueType,
					'name' => ucfirst($valueType),
				]);
			}
		}
	}
}
