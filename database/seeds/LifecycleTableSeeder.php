<?php
use Illuminate\Database\Seeder;

class LifecycleTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$initiated = DB::table('lifecycle')
			->where('id', '=', 0)
			->first();
		$fullyCreated = DB::table('lifecycle')
			->where('id', '=', 1)
			->first();

		if (empty($initiated)) {
			DB::table('lifecycle')->insert(['id' => 1, 'status' => 'Initiated']);
			DB::table('lifecycle')
				->where('id', 1)
				->update(['id' => 0]);
		}

		if (empty($fullyCreated)) {
			DB::table('lifecycle')->insert(['id' => 2, 'status' => 'Fully created']);
			DB::table('lifecycle')
				->where('id', 2)
				->update(['id' => 1]);
		}
	}
}
