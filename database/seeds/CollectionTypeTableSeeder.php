<?php
use Illuminate\Database\Seeder;

class CollectionTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$collection_types = json_decode(
			file_get_contents(dirname(__FILE__) . '/data/collection_types.json'),
			true
		);

		foreach ($collection_types['keys'] as $collection_type) {
			$key = $collection_type;

			$collectionTypeDB = DB::table('collection_type')
				->where('key', '=', $key)
				->first();

			if (empty($collectionTypeDB)) {
				DB::table('collection_type')->insert([
					'key' => $key,
				]);
			}
		}
	}
}
