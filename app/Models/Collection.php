<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\ClientTime;

class Collection extends Model
{
	use SoftDeletes;
	use ClientTime;

	protected $table = 'collection';
	protected $fillable = [
		'name',
		'ref',
		'description',
		'visibility',
		'start_date',
		'end_date',
		'host',
		'sub_type',
		'created_ct',
		'updated_ct',
		'deleted_ct',
	];
	public static $rules = [
		'name' => 'required|string|max:255',
		'ref' => 'required|string|max:32|valid_ref',
		'description' => 'string|max:4000',
		'visibility' => 'string',
		'start_date' => 'date|required_with:end_date|before:end_date|after:1970-01-01',
		'end_date' => 'date|required_with:start_date|after:start_date|after:1970-01-01',
		'host' => 'string|max:32|valid_ref',
		'metadata' => 'nullable|valid_hjson',
		'avatar' => 'nullable|file',
		'sub_type' =>
			'nullable|string|max:32|exists:collection_type,key|in:blind,double_blind,horizontal,vertical',
		'created_ct' => 'date|after:1970-01-01',
		'updated_ct' => 'date|after:1970-01-01',
		'deleted_ct' => 'date|after:1970-01-01',
		'theme' => 'string|max:128',
	];
	public $hidden = [
		'id',
		'collection_type_id',
		'collection_type_id_subtype',
		'collection_access_type_id',
		'deleted_at',
		'created_ct',
		'updated_ct',
		'deleted_ct',
	];

	public function getMetadataAttribute($value)
	{
		if (gettype($value) === 'object') {
			return $value;
		}

		return empty($value) ? null : json_decode($value);
	}

	public function collectionImpressions()
	{
		return $this->hasMany('App\Models\CollectionImpression', 'collection_id');
	}

	public function teamCollections()
	{
		return $this->hasMany('App\Models\TeamCollection', 'collection_id');
	}

	public function collectionAccessType()
	{
		return $this->belongsTo('App\Models\CollectionAccessType', 'collection_access_type_id');
	}

	public function collectionType()
	{
		return $this->belongsTo('App\Models\CollectionType', 'collection_type_id');
	}

	public function collectionSubType()
	{
		return $this->belongsTo('App\Models\CollectionType', 'collection_type_id_subtype');
	}

	public function collectionFeatured()
	{
		return $this->belongsTo('App\Models\CollectionFeatured');
	}

	public function impressions()
	{
		return $this->hasMany('App\Models\Impression', 'collection_id');
	}
}
