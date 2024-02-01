<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeamAction extends Model
{
	use SoftDeletes;

	protected $table = 'team_action';
	protected $fillable = [
		'ref',
		'user_id',
		'team_id',
		'action_type_id',
		'relation_type_id',
		'status',
	];
	protected $hidden = [
		'id',
		'user_id',
		'team_id',
		'action_type_id',
		'relation_type_id',
		'type',
		'deleted_at',
		'actionType',
		'relationType',
	];

	public static function getList(
		$args = [],
		$with = ['team', 'user', 'user.identity', 'actionType', 'relationType']
	) {
		$where = [['deleted_at', '=', null]];

		if (!empty($args['user_id'])) {
			array_push($where, ['user_id', '=', $args['user_id']]);
		}

		if (!empty($args['team_id'])) {
			array_push($where, ['team_id', '=', $args['team_id']]);
		}

		if (!empty($args['action_type_id'])) {
			array_push($where, ['action_type_id', '=', $args['action_type_id']]);
		}

		if (!empty($args['status'])) {
			array_push($where, ['status', '=', $args['status']]);
		}

		return self::with($with)
			->where($where)
			->get();
	}

	public static function getFullData(
		$user = null,
		$team = null,
		$actionType = null,
		$actionRef = null
	) {
		$where = [['deleted_at', '=', null]];

		if (!empty($user)) {
			array_push($where, ['user_id', '=', $user->id]);
		}

		if (!empty($team)) {
			array_push($where, ['team_id', '=', $team->id]);
		}

		if (!empty($actionType)) {
			array_push($where, ['action_type_id', '=', $actionType->id]);
		}

		if (!empty($actionRef)) {
			array_push($where, ['ref', '=', $actionRef]);
		}

		return self::with(['team', 'user', 'user.identity', 'actionType', 'relationType'])
			->where($where)
			->first();
	}

	public function team()
	{
		return $this->belongsTo('App\Models\Team');
	}

	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	// Relationships
	public function actionType()
	{
		return $this->hasOne('App\Models\ActionType', 'id', 'action_type_id');
	}

	public function relationType()
	{
		return $this->hasOne('App\Models\RelationType', 'id', 'relation_type_id');
	}
}
