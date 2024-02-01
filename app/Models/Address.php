<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class Address extends Model
{
	protected $table = 'address';
	protected $fillable = ['info1', 'info2', 'region', 'country_id'];

	public static $rules = [
		'info1' => 'nullable|string|max:255',
		'info2' => 'nullable|string|max:255',
		'region' => 'nullable|string|max:255',
		'country_id' => 'nullable|numeric|exists:country,id',
		'country_code' => 'nullable|string|max:2|exists:country,alpha2',
	];

	public function userDemographic()
	{
		return $this->belongsTo('App\Models\UserDemographic', 'user_demographic_id', 'id');
	}

	public function country()
	{
		return $this->hasOne('App\Models\Country', 'id', 'country_id');
	}

	public function locality()
	{
		return $this->hasOne('App\Models\Locality', 'id', 'locality_id');
	}
}
