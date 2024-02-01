<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeamCollection extends Model
{
	use SoftDeletes;
	protected $table = 'team_collection';
	protected $fillable = ['collection_id', 'team_id'];
	protected $auditKeys = ['collection_id', 'team_id', 'type'];

	public static $rules = [
		'collection_id' => 'required|integer|exists:collection,id',
		'team_id' => 'required|integer|exists:team,id',
	];

	public static function getWithCollectionsByTeamId($teamId)
	{
		return self::with('collection')
			->where('team_id', '=', $teamId)
			->whereNull('deleted_at')
			->get();
	}

	// Relationships
	public function collection()
	{
		return $this->belongsTo('App\Models\Collection');
	}

	public function team()
	{
		return $this->belongsTo('App\Models\Team');
	}
}
