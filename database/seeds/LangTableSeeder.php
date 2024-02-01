<?php
use Illuminate\Database\Seeder;

class LangTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$lang1 = DB::table('lang')
			->where('key', '=', 'testlangkey1')
			->first();
		$lang2 = DB::table('lang')
			->where('key', '=', 'testlangkey2')
			->first();
		$lang3 = DB::table('lang')
			->where('key', '=', 'testlangkey3')
			->first();

		if (empty($lang1)) {
			DB::table('lang')->insert([
				'key' => 'testlangkey1',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($lang2)) {
			DB::table('lang')->insert([
				'key' => 'testlangkey2',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($lang3)) {
			DB::table('lang')->insert([
				'key' => 'testlangkey3',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		$langs = json_decode(file_get_contents(dirname(__FILE__) . '/data/language.json'), true);
		foreach ($langs as $lang) {
			$langDB = DB::table('lang')
				->where('key', '=', $lang['key'])
				->first();

			if (empty($langDB)) {
				DB::table('lang')->insert([
					'key' => $lang['key'],
					'name' => $lang['name'],
				]);
			}
		}
		// factory(App\Models\Lang::class, 10)->create();
	}
}
