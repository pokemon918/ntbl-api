<?php
use Illuminate\Database\Seeder;

class ImpressionTypeTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$unknown = DB::table('impression_type')
			->where('id', '=', 0)
			->first();

		$wine = DB::table('impression_type')
			->where('id', '=', 1)
			->first();

		if (empty($unknown)) {
			DB::table('impression_type')->insert(['id' => 1, 'ref' => 'unknown']);
			DB::table('impression_type')
				->where('id', 1)
				->update(['id' => 0]);
		}

		if (empty($wine)) {
			DB::table('impression_type')->insert(['id' => 2, 'ref' => 'wine']);
			DB::table('impression_type')
				->where('id', 2)
				->update(['id' => 1]);
		}
	}
}
