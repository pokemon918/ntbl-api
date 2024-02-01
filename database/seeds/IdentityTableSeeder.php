<?php
use Illuminate\Database\Seeder;

use App\Models\Role;
use App\Models\Relation;
use App\Helpers\StringHelper;

class IdentityTableSeeder extends Seeder
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
		$devRefs = config('app.devRefs');

		$ctr = 1;
		foreach ($devRefs as $devRef) {
			$user = DB::table('user')
				->where('ref', '=', $devRef)
				->first();

			if (empty($user)) {
				DB::table('user')->insert([
					'ref' => strtolower($devRef),
					'name' => 'Dev ' . ucfirst($devRef),
					'handle' => 'dev' . strtolower($devRef),
				]);

				$user = DB::table('user')
					->where('ref', '=', strtolower($devRef))
					->first();

				DB::table('identity')->insert([
					'user_id' => $user->id,
					'email' => "dev{$ctr}@ntbl-api.com",
					'hpass' => 'dev1234',
					'salt' => '',
					'iterations' => 0,
					'reset_token' => '',
					'created_at' => date('Y-m-d H:i:s'),
					'updated_at' => date('Y-m-d H:i:s'),
				]);

				$ctr++;
			}
		}
	}
}
