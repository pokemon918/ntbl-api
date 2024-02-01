<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CollectionAccessType extends Model
{
	protected $table = 'collection_access_type';

	// Relationships
	public function collections()
	{
		return $this->hasMany('App\Models\Collection', 'collection_access_type_id');
	}
}
