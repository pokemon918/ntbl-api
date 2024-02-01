<?php

use Illuminate\Database\Seeder;
use App\Helpers\StringHelper;
use App\Models\User;
use App\Models\UserBadge;
use App\Models\Badge;

class UserBadgesTableSeeder extends Seeder
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
		$badges = ['Developer', 'Super Admin', 'Admin', 'Translator', 'Expert'];
		$devRefs = config('app.devRefs');

		foreach ($badges as $badge) {
			$key = strtolower(str_replace(' ', '_', $badge));
			$badgeDB = DB::table('badges')
				->where('key', '=', $key)
				->first();

			if (empty($badgeDB)) {
				DB::table('badges')->insert([
					'key' => $key,
					'name' => $badge,
				]);
			}
		}

		$developerRole = Badge::where('key', '=', 'developer')->first();

		foreach ($devRefs as $devRef) {
			$user = User::where('ref', '=', strtolower($devRef))->first();
			if (!empty($user)) {
				$badge = UserBadge::where([
					['user_id', '=', $user->id],
					['badge_id', '=', $developerRole->id],
				])->first();

				if (empty($badge)) {
					$userRole = new UserBadge([
						'user_id' => $user->id,
						'badge_id' => $developerRole->id,
					]);
					$userRole->save();
				}
			}
		}
	}
}
