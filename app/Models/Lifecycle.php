<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lifecycle extends Model
{
	protected $table = 'lifecycle';

	// Relationships
	public function impressions()
	{
		return $this->hasMany('App\Models\Impression', 'lifecycle_id');
	}
}
