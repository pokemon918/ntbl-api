<?php
use Illuminate\Database\Seeder;
use App\Models\Country;

class CountryTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		// Seed the countries. Resource taken from - https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes/blob/master/all/all.csv
		$countries = json_decode(file_get_contents(dirname(__FILE__) . '/data/country.json'), true);

		foreach ($countries as $country) {
			$countryObj = Country::where('id', '=', $country['country-code'])->first();

			if (empty($countryObj)) {
				Country::create([
					'id' => intval($country['country-code']),
					'name' => $country['name'],
					'alpha2' => $country['alpha-2'],
					'alpha3' => $country['alpha-3'],
					'country_code' => $country['country-code'],
					'iso_3166_2' => $country['iso_3166-2'],
					'region' => $country['region'],
					'sub_region' => $country['sub-region'],
					'intermediate_region' => $country['intermediate-region'],
					'region_code' => $country['region-code'],
					'sub_region_code' => $country['sub-region-code'],
					'intermediate_region_code' => $country['intermediate-region-code'],
				]);
			}
		}
	}
}
