<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Visibility extends Model
{
	protected $table = 'visibility';

	// Relationships
	public function teams()
	{
		return $this->hasMany('App\Models\Team', 'visibility_id');
	}
}
