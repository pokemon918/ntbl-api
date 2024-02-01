<?php
use Illuminate\Database\Seeder;

class OriginTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$unknown = DB::table('origin')
			->where('id', '=', 0)
			->first();

		if (empty($unknown)) {
			DB::table('origin')->insert(['id' => 1, 'client' => 'Unknown', 'version' => '0.0.0']);
			DB::table('origin')
				->where('id', 1)
				->update(['id' => 0]);
		}
	}
}
