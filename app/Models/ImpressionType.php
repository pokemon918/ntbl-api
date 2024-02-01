<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImpressionType extends Model
{
	protected $table = 'impression_type';

	// Relationships
	public function impressions()
	{
		return $this->hasMany('App\Models\Impression', 'impression_type_id');
	}
}
