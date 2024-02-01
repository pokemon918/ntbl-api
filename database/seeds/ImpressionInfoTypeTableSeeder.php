<?php

use Illuminate\Database\Seeder;
use App\Helpers\StringHelper;

class ImpressionInfoTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$infoTypes = json_decode(
			file_get_contents(dirname(__FILE__) . '/data/impression_info_types.json'),
			true
		);

		foreach ($infoTypes as $infoType) {
			$infoKey = $infoType['key'];

			$infoTypeDB = DB::table('impression_info_type')
				->where('key', '=', $infoKey)
				->first();

			if (empty($infoTypeDB)) {
				DB::table('impression_info_type')->insert([
					'key' => $infoKey,
					'name' => ucfirst($infoKey),
					'value_type' => $infoType['value_type'],
				]);
			}
		}
	}
}
