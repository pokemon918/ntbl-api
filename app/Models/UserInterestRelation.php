<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\UserInterest;

class UserInterestRelation extends Model
{
	use SoftDeletes;
	protected $table = 'user_interest_relation';
	protected $fillable = ['ref', 'user_id', 'user_interest_id', 'user_interest_type_id'];
	public $timestamps = false;

	public function userInterest()
	{
		return $this->hasOne('App\Models\UserInterest', 'id', 'user_interest_id');
	}

	public function userInterestType()
	{
		return $this->hasOne('App\Models\UserInterestType', 'id', 'user_interest_type_id');
	}

	public static function deleteByRefs($interestRefs, $user)
	{
		$interestsDB = self::with(['userInterest.userInterestRelation'])
			->whereIn('ref', $interestRefs)
			->where('user_id', '=', $user->id)
			->get();

		foreach ($interestsDB as $interestDB) {
			$interestDB
				->userInterest()
				->first()
				->delete();
		}

		$interestsDBRefs = $interestsDB->pluck('ref');
		$interestsDB->each->delete();
		return $interestsDBRefs;
	}
}
