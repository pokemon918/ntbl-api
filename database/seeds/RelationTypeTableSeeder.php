<?php

use Illuminate\Database\Seeder;

class RelationTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$relationTypes = json_decode(
			file_get_contents(dirname(__FILE__) . '/data/relation_types.json'),
			true
		);

		foreach ($relationTypes as $relationType) {
			$relationKey = $relationType['key'];
			$relationName = $relationType['name'];

			$relationTypeDB = DB::table('relation_type')
				->where('key', '=', $relationKey)
				->first();

			if (empty($relationTypeDB)) {
				DB::table('relation_type')->insert([
					'key' => $relationKey,
					'name' => $relationName,
				]);
			}
		}
	}
}
