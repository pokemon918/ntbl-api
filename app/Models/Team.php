<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\ClientTime;

class Team extends Model
{
	use SoftDeletes;
	use ClientTime;

	protected $table = 'team';
	protected $fillable = [
		'name',
		'ref',
		'handle',
		'description',
		'city',
		'country',
		'visibility',
		'created_ct',
		'updated_ct',
		'deleted_ct',
	];
	public static $rules = [
		'name' => 'required|string|max:255',
		'ref' => 'required|string|max:32|valid_ref',
		'handle' => 'string|max:255|valid_handle|unique:team,handle',
		'description' => 'string|max:4000',
		'avatar' => 'nullable|file',
		'city' => 'string|max:255',
		'country' => 'string|max:2|exists:country,alpha2',
		'created_ct' => 'date|after:1970-01-01',
		'updated_ct' => 'date|after:1970-01-01',
		'deleted_ct' => 'date|after:1970-01-01',
	];
	public $hidden = [
		'id',
		'team_type_id',
		'teamType',
		'team_access_type_id',
		'deleted_at',
		'created_ct',
		'updated_ct',
		'deleted_ct',
		'parent_id',
		'relations',
		'relation_type_id',
		'team_id',
		'user_id',
		'key',
		'role',
		'access_type',
		'visibility_id',
	];
	// Becase above laravel default can't be redeclared as static
	public static $hidden_fields = [
		'id',
		'team_type_id',
		'team_access_type_id',
		'deleted_at',
		'created_ct',
		'updated_ct',
		'deleted_ct',
		'parent_id',
	];

	public static function getByHandleAndVisibility($handle, $visibilityKeys, $type = 'traditional')
	{
		$results = self::select('team.*', 'visibility.key as visibility')
			->join('team_type', 'team_type.id', 'team.team_type_id')
			->join('visibility', 'visibility.id', 'team.visibility_id')
			->where('team.handle', '=', $handle)
			->whereNull('team.deleted_at')
			->where('team_type.key', '=', $type)
			->whereIn('visibility.key', $visibilityKeys)
			->orderBy('created_at', 'desc')
			->take(config('app.search.max_return_size', 10))
			->first();

		return self::sanitizeResults($results);
	}

	public static function getByKeywordAndVisibility($keyword, $visibilityKeys)
	{
		$results = self::select('team.*', 'visibility.key as visibility')
			->join('visibility', 'visibility.id', 'team.visibility_id')
			->where('team.handle', 'LIKE', '%' . $keyword . '%')
			->orWhere('team.name', 'LIKE', '%' . $keyword . '%')
			->whereNull('team.deleted_at')
			->whereIn('visibility.key', $visibilityKeys)
			->orderBy('created_at', 'desc')
			->take(config('app.search.max_return_size', 10))
			->get();

		return self::sanitizeResults($results);
	}

	public static function getByVisibility($visibilityKeys)
	{
		$results = self::select(
			'team.*',
			'visibility.key as visibility',
			'team_access_type.key as access'
		)
			->join('visibility', 'visibility.id', 'team.visibility_id')
			->join('team_access_type', 'team_access_type.id', 'team.team_access_type_id')
			->whereNull('team.deleted_at')
			->whereIn('visibility.key', $visibilityKeys)
			->orderBy('created_at', 'desc')
			->get();

		return self::sanitizeResults($results);
	}

	public static function getChildTeamsByIdAndType($teamId, $type)
	{
		return self::where('team.parent_id', $teamId)
			->select('team.*', 'team_type.key as type')
			->whereNull('team.deleted_at')
			->join('team_type', 'team_type.id', 'team.team_type_id')
			->where('team_type.key', $type)
			->get();
	}

	private static function sanitizeResults($results)
	{
		if (empty($results)) {
			return $results;
		}

		return $results->makeHidden(self::$hidden_fields);
	}

	// Relationships
	public function relations()
	{
		return $this->hasMany('App\Models\TeamUser', 'team_id');
	}

	public function teamCollections()
	{
		return $this->hasMany('App\Models\TeamCollection', 'team_id');
	}

	public function teamType()
	{
		return $this->belongsTo('App\Models\TeamType');
	}

	public function teamAccessType()
	{
		return $this->belongsTo('App\Models\TeamAccessType');
	}

	public function actions()
	{
		return $this->hasMany('App\Models\TeamAction', 'team_id');
	}

	public function contestTeam()
	{
		return $this->hasOne('App\Models\ContestTeam', 'team_id');
	}

	public function childTeams()
	{
		return $this->hasMany('App\Models\Team', 'parent_id');
	}

	public function teamActions()
	{
		return $this->hasMany('App\Models\TeamAction', 'team_id');
	}

	public function visibility()
	{
		return $this->belongsTo('App\Models\Visibility');
	}
}
