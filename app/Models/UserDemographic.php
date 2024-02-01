<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserDemographic extends Model
{
	protected $table = 'user_demographic';
	protected $hidden = ['user_id'];

	// Relationships
	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	public function address()
	{
		return $this->hasOne('App\Models\Address', 'id', 'address_id');
	}

	public function languages()
	{
		return $this->hasMany('App\Models\UserLanguage', 'user_demographic_id');
	}

	// todo : lang_ref
}
