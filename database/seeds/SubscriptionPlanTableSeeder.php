<?php

use Illuminate\Database\Seeder;
use App\Helpers\StringHelper;

class SubscriptionPlanTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$subscriptionPlans = [
			'subscribe' => 0,
			'view' => 10,
			'basic' => 20,
			'pro' => 30,
			'scholar' => 40,
		];

		foreach ($subscriptionPlans as $subscriptionPlan => $weight) {
			$name = ucfirst(str_replace('_', ' ', $subscriptionPlan));
			$subscriptionPlanDB = DB::table('subscription_plan')
				->where('key', '=', $subscriptionPlan)
				->first();

			if (empty($subscriptionPlanDB)) {
				DB::table('subscription_plan')->insert([
					'key' => $subscriptionPlan,
					'name' => $name,
					'weight' => $weight,
				]);
			}
		}
	}
}
