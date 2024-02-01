<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeamAccessType extends Model
{
	protected $table = 'team_access_type';

	// Relationships
	public function collections()
	{
		return $this->hasMany('App\Models\Collection', 'team_access_type_id');
	}
}
