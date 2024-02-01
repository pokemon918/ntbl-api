<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeamType extends Model
{
	protected $table = 'team_type';
	public $timestamps = false;

	public function team()
	{
		return $this->hasMany('App\Models\Team', 'team_type_id');
	}
}
