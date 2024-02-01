<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Country extends Model
{
	protected $table = 'country';
	public $timestamps = false;

	public function address()
	{
		return $this->belongsTo('App\Models\Address', 'id', 'country_id');
	}

	public function locality()
	{
		return $this->belongsTo('App\Models\Locality', 'id', 'country_id');
	}

	public function userEducation()
	{
		return $this->belongsTo('App\Models\UserEducation', 'id', 'country_id');
	}
}
