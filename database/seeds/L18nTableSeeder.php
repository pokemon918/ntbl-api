<?php
use Illuminate\Database\Seeder;

use App\Helpers\StringHelper;

class L18nTableSeeder extends Seeder
{
	public function __construct()
	{
		$this->refLength = config('app.identity.refLength');
	}

	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$l18n1 = DB::table('l18n')
			->where([['lang_id', '=', 1], ['val', '=', 'l18nval1']])
			->first();
		$l18n2 = DB::table('l18n')
			->where([['lang_id', '=', 2], ['val', '=', 'l18nval2']])
			->first();
		$l18n3 = DB::table('l18n')
			->where([['lang_id', '=', 3], ['val', '=', 'l18nval3']])
			->first();

		if (empty($l18n1)) {
			DB::table('l18n')->insert([
				'lang_id' => 1,
				'ref' => StringHelper::readableRefGenerator($this->refLength, 'l18n', 'ref'),
				'val' => 'l18nval1',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($l18n2)) {
			DB::table('l18n')->insert([
				'lang_id' => 2,
				'ref' => StringHelper::readableRefGenerator($this->refLength, 'l18n', 'ref'),
				'val' => 'l18nval2',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($l18n3)) {
			DB::table('l18n')->insert([
				'lang_id' => 3,
				'ref' => StringHelper::readableRefGenerator($this->refLength, 'l18n', 'ref'),
				'val' => 'l18nval3',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		// factory(App\Models\L18n::class, 10)->create();
	}
}
