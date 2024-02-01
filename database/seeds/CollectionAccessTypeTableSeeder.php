<?php

use Illuminate\Database\Seeder;

class CollectionAccessTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		// 'open', 'hidden', 'private'

		$open = DB::table('collection_access_type')
			->where('id', '=', 1)
			->first();

		$hidden = DB::table('collection_access_type')
			->where('id', '=', 2)
			->first();

		$private = DB::table('collection_access_type')
			->where('id', '=', 3)
			->first();

		if (empty($open)) {
			DB::table('collection_access_type')->insert([
				'id' => 1,
				'key' => 'open',
				'name' => 'Open',
			]);
			DB::table('collection_access_type')->where('id', 1);
		}

		if (empty($hidden)) {
			DB::table('collection_access_type')->insert([
				'id' => 2,
				'key' => 'unlisted',
				'name' => 'Unlisted',
			]);
			DB::table('collection_access_type')->where('id', 2);
		}

		if (empty($private)) {
			DB::table('collection_access_type')->insert([
				'id' => 3,
				'key' => 'private',
				'name' => 'Private',
			]);
			DB::table('collection_access_type')->where('id', 3);
		}
	}
}
