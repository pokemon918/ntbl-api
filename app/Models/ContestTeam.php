<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContestTeam extends Model
{
	use SoftDeletes;
	protected $table = 'contest_team';

	protected $fillable = [
		'team_id',
		'admin_alias',
		'leader_alias',
		'guide_alias',
		'participant_alias',
		'collection_alias',
		'theme_alias',
		'division_alias',
		'marked_impression_alias',
	];

	public static $rules = [
		'team_id' => 'required|integer|exists:team,id',
		'alias' => 'required|string|max:64',
	];

	public $hidden = ['id'];

	// Relationships
	public function team()
	{
		return $this->belongsTo('App\Models\Team');
	}
}
