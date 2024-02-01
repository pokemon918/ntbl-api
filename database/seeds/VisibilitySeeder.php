<?php
use Illuminate\Database\Seeder;

class VisibilitySeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		/*
            private: Only members can find and see content
            hidden: Only members can find via search but every user can see content
            public: every user can find it when searching and see content
            Ref: https://trello.com/c/Cpdigp72/1266-team-1266-team-openness#comment-5efdcb33e1a9350b6cff96e6
        */

		$public = DB::table('visibility')
			->where('id', '=', 1)
			->first();

		$hidden = DB::table('visibility')
			->where('id', '=', 2)
			->first();

		$private = DB::table('visibility')
			->where('id', '=', 3)
			->first();

		if (empty($public)) {
			DB::table('visibility')->insert([
				'id' => 1,
				'key' => 'public',
				'name' => 'Public',
			]);
			DB::table('visibility')->where('id', 1);
		}

		if (empty($hidden)) {
			DB::table('visibility')->insert([
				'id' => 2,
				'key' => 'hidden',
				'name' => 'Hidden',
			]);
			DB::table('visibility')->where('id', 2);
		}

		if (empty($private)) {
			DB::table('visibility')->insert([
				'id' => 3,
				'key' => 'private',
				'name' => 'Private',
			]);
			DB::table('visibility')->where('id', 3);
		}
	}
}
