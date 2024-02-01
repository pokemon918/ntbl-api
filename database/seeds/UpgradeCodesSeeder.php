<?php

use Carbon\Carbon;
use Illuminate\Database\Seeder;

class UpgradeCodesSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		if (!PROD) {
			$upgradeVouchers = json_decode(
				file_get_contents(dirname(__FILE__) . '/data/upgrade-vouchers.json'),
				true
			);

			$usageLimit = config('subscription.local.voucher.default_usage_limit');
			$validDays = config('subscription.local.voucher.valid_days');

			foreach ($upgradeVouchers as $plan => $codes) {
				foreach ($codes as $code) {
					$voucher = DB::table('voucher')
						->where('code', '=', $code)
						->first();

					if (empty($voucher)) {
						DB::table('voucher')->insert([
							'code' => $code,
							'plan' => $plan,
							'type' => 'upgrade',
							'usage_limit' => $usageLimit,
							'valid_days' => $validDays,
							'created_at' => Carbon::now(),
							'updated_at' => Carbon::now(),
						]);
					}
				}
			}
		}
	}
}
