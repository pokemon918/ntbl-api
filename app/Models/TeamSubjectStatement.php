<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class TeamSubjectStatement extends Model
{
	protected $table = 'team_subject_statement';
	protected $fillable = [
		'id',
		'team_id',
		'collection_impression_id',
		'marked_impression',
		'flag',
		'requested',
		'statement',
		'extra_a',
		'extra_b',
		'extra_c',
		'extra_d',
		'extra_e',
		'metadata',
	];
	public static $rules = [
		'marked_impression' => 'nullable|valid_ref|exists:impression,ref',
		'flag' => 'nullable|boolean',
		'requested' => 'nullable|boolean',
		'statement' => 'nullable|string|max:32',
		'extra_a' => 'nullable|string|max:32',
		'extra_b' => 'nullable|string|max:32',
		'extra_c' => 'nullable|string|max:32',
		'extra_d' => 'nullable|string|max:32',
		'extra_e' => 'nullable|string|max:32',
		'metadata' => 'nullable|valid_hjson',
	];
	public $timestamps = false;

	public $hidden = ['id', 'team_id', 'collection_impression_id', 'marked_impression_legacy'];

	// Relationships

	public function collectionImpression()
	{
		return $this->belongsTo('App\Models\CollectionImpression');
	}

	public function team()
	{
		return $this->belongsTo('App\Models\Team', 'team_id');
	}

	public function impression()
	{
		return $this->belongsTo('App\Models\Impression', 'marked_impression');
	}

	public static function getTeamProgressGroupedByCollectionTheme($team)
	{
		return DB::table('team_subject_statement as s')
			->select(
				'c.theme as theme',
				'c.id as collection_id',
				DB::raw(
					'SUM(' .
						DB_PREFIX .
						'ci.id = ' .
						DB_PREFIX .
						's.collection_impression_id) as done'
				),
				DB::raw('COUNT(' . DB_PREFIX . 'ci.id) as todo')
			)
			->leftjoin('team', 'team.id', '=', 's.team_id')
			->leftjoin('team_collection as tc', 'tc.team_id', '=', 'team.id')
			->leftjoin('collection as c', 'c.id', '=', 'tc.collection_id')
			->leftjoin('collection_impression as ci', 'ci.collection_id', '=', 'c.id')
			->where('s.team_id', '=', $team->id)
			->where('tc.team_id', '=', $team->id)
			->groupBy('c.theme')
			->groupBy('ci.collection_id')
			->get();
	}

	public function getRequestedAttribute($value)
	{
		return (bool) $value;
	}

	public function getFlagAttribute($value)
	{
		return (bool) $value;
	}

	public function getMetadataAttribute($value)
	{
		if (gettype($value) === 'object') {
			return $value;
		}

		return empty($value) ? null : json_decode($value);
	}
}
