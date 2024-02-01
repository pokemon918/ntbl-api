<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class Locality extends Model
{
	protected $table = 'locality';
	protected $fillable = ['name', 'postal_code', 'country_id'];
	public $timestamps = false;

	public static $rules = [
		'name' => 'nullable|string|max:255',
		'postal_code' => 'nullable|string|max:15',
		'country_id' => 'nullable|numeric|exists:country,id',
		'country_code' => 'nullable|string|max:2|exists:country,alpha2',
		// todo : international post code validation
		// https://github.com/axlon/laravel-postal-code-validation
	];

	public function address()
	{
		return $this->belongsTo('App\Models\Address', 'id', 'locality_id');
	}

	public function country()
	{
		return $this->hasOne('App\Models\Country', 'id', 'country_id');
	}
}
