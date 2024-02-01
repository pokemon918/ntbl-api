<?php
namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CollectionFeatured extends Model
{
	protected $table = 'collection_featured';
	protected $fillable = ['collection_id', 'event_ref', 'feature_start', 'feature_end'];
	public $timestamps = false;

	public static $rules = [
		'event_ref' => 'required|string|max:32|valid_ref|exists:collection,ref,deleted_at,NULL',
		'feature_start' => 'required|date|after:2019-01-01',
		'feature_end' => 'required|date|after:today|after:2019-01-01',
	];

	public static function count()
	{
		return self::with('collection')
			->where([['feature_start', '<=', Carbon::now()], ['feature_end', '>=', Carbon::now()]])
			->has('collection')
			->groupBy('collection_id')
			->get()
			->count();
	}

	public function user()
	{
		return $this->hasOne('App\Models\User', 'id', 'user_id');
	}

	public function collection()
	{
		return $this->hasOne('App\Models\Collection', 'id', 'collection_id');
	}
}
