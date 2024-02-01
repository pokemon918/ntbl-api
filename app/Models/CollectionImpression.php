<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CollectionImpression extends Model
{
	protected $table = 'collection_impression';
	protected $fillable = ['collection_id', 'impression_id'];
	protected $auditKeys = ['collection_id', 'impression_id'];
	public $timestamps = false;

	public static $rules = [
		'collection_id' => 'required|integer|exists:collection,id',
		'impression_id' => 'required|integer|exists:impression,id',
	];

	// Relationships
	public function collection()
	{
		return $this->belongsTo('App\Models\Collection');
	}

	public function impression()
	{
		return $this->belongsTo('App\Models\Impression');
	}

	public function statements()
	{
		return $this->hasMany('App\Models\TeamSubjectStatement', 'collection_impression_id', 'id');
	}
}
