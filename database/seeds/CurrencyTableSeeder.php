<?php
use Illuminate\Database\Seeder;

class CurrencyTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$currencies = json_decode(
			file_get_contents(dirname(__FILE__) . '/data/currency.json'),
			true
		);
		foreach ($currencies as $currency) {
			$currencyDB = DB::table('currency')
				->where('key', '=', $currency['key'])
				->first();

			if (empty($currencyDB)) {
				DB::table('currency')->insert([
					'key' => $currency['key'],
					'name' => $currency['name'],
				]);
			}
		}
	}
}
