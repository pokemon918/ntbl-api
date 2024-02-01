<?php

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use App\Services\SubscriptionService;
use App\Services\UserService;

class TestUsersSeeder extends Seeder
{
	public function __construct()
	{
		$this->refLength = config('app.identity.refLength');
		$this->userService = new UserService();
		$this->subscriptionService = new SubscriptionService();

		// Precomputed hpass of '1234'
		$this->iterations = 15001;
		$this->hpass = '8508fa75ea80e5479a48d0f6895752ddcad51f1c298f59f22bae2bbdbb008312';
		$this->salt = 'd84fba3fff73c336d12b3a71e949351289bf12839f6a262523646bc9e8a99c3d';
	}

	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$testUsers = json_decode(
			file_get_contents(dirname(__FILE__) . '/data/test_users.json'),
			true
		);

		foreach ($testUsers as $testUser) {
			$user = DB::table('user')
				->where('ref', '=', $testUser['ref'])
				->first();

			if (empty($user)) {
				DB::table('user')->insert([
					'ref' => $testUser['ref'],
					'name' => $testUser['name'],
					'handle' => $testUser['handle'],
				]);

				$user = DB::table('user')
					->where('name', '=', $testUser['ref'])
					->first();

				DB::table('identity')->insert([
					'user_id' => $user->id,
					'email' => $testUser['email'],
					'hpass' => $this->hpass,
					'salt' => $this->salt,
					'iterations' => $this->iterations,
					'reset_token' => '',
					'created_at' => Carbon::now(),
					'updated_at' => Carbon::now(),
				]);

				// After the whole user data has been taken care of, create a subscription for the user
				$this->subscriptionService->addUserSubscription($user, $testUser['plan']);
			}
		}

		// Add initial subscription to dev accounts
		$devRefs = config('app.devRefs');
		foreach ($devRefs as $devRef) {
			$devUser = DB::table('user')
				->where('ref', '=', $devRef)
				->first();

			$this->subscriptionService->addUserSubscription(
				$devUser,
				config('subscription.local.initial_plan')
			);
		}
	}
}
