<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\RelationType;

class TeamUser extends Model
{
	use SoftDeletes;
	protected $table = 'team_user';
	protected $fillable = ['user_id', 'relation_type_id', 'team_id'];
	protected $auditKeys = ['user_id', 'relation_type_id', 'team_id'];

	public static $rules = [
		'user_id' => 'required|integer|exists:user,id',
		'relation_type_id' => 'required|integer|exists:relation_type,id',
		'team_id' => 'integer|exists:team,id',
		'metadata' => 'nullable|valid_hjson',
	];

	// Relationships
	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	public function relation_type()
	{
		return $this->belongsTo('App\Models\RelationType');
	}

	public function team()
	{
		return $this->belongsTo('App\Models\Team');
	}

	public static function getTeamRelationsWithUsers($teamId)
	{
		return self::with('user')
			->where([['team_id', '=', $teamId]])
			->whereNull('deleted_at')
			->groupBy('user_id')
			->get();
	}

	public static function getByRelationKey($teamId, $key)
	{
		$relationType = RelationType::where('key', '=', $key)->first();
		return self::where([
			['relation_type_id', '=', $relationType->id],
			['team_id', '=', $teamId],
		])->whereNull('deleted_at');
	}

	public static function getCurrentUserRelations($teamId)
	{
		$currentUser = Auth::user();
		$currentUserRelations = self::with('relation_type')
			->where([['user_id', '=', $currentUser->user_id], ['team_id', '=', $teamId]])
			->whereNull('deleted_at')
			->groupBy('relation_type_id')
			->get();

		return $currentUserRelations;
	}

	public static function getUserRelations($userId, $teamId)
	{
		$userRelations = self::where([['user_id', '=', $userId], ['team_id', '=', $teamId]])
			->whereNull('deleted_at')
			->groupBy('relation_type_id')
			->get();

		return $userRelations;
	}

	public function getMetadataAttribute($value)
	{
		if (gettype($value) === 'object') {
			return $value;
		}

		return empty($value) ? null : json_decode($value);
	}
}
