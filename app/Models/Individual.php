<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Individual extends Model
{
	protected $table = 'individual';
	protected $fillable = [
		'impression_id',
		'summary_wine',
		'summary_personal',
		'food_pairing',
		'location',
		'lat',
		'long',
	];

	public $timestamps = false;
	public static $rules = [
		'impression_id' => 'required|integer',
		'summary_wine' => 'max:4000|valid_long_text',
		'summary_personal' => 'max:4000|valid_long_text',
		'food_pairing' => 'max:4000|valid_long_text',
		'drinkability' => 'nullable|numeric|between:0,1|valid_rating',
		'maturity' => 'nullable|numeric|between:0,1|valid_rating',
		'location' => 'string|max:64',
		'lat' => 'numeric|required_with:long|valid_latitude',
		'long' => 'numeric|required_with:lat|valid_longitude',
	];

	// Relationships
	public function impression()
	{
		return $this->belongsTo('App\Models\Impression');
	}
}
