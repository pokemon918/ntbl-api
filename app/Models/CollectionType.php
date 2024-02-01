<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CollectionType extends Model
{
	protected $table = 'collection_type';

	// Relationships
	public function collections()
	{
		return $this->hasMany('App\Models\Collection', 'collection_type_id');
	}
}
