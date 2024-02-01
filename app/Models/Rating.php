<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rating extends Model
{
	protected $table = 'rating';
	protected $fillable = [
		'impression_id',
		'version',
		'final_points',
		'balance',
		'length',
		'intensity',
		'terroir',
		'complexity',
	];

	public $timestamps = false;
	public static $rules = [
		'impression_id' => 'required|integer',
		'version' => 'required|max:16|valid_version',
		'final_points' => 'required|numeric|between:0,100|valid_parker_val',
		'balance' => 'required|numeric|between:0,1|valid_rating',
		'length' => 'required|numeric|between:0,1|valid_rating',
		'intensity' => 'required|numeric|between:0,1|valid_rating',
		'terroir' => 'required|numeric|between:0,1|valid_rating',
		'complexity' => 'required|numeric|between:0,1|valid_rating',
	];

	// Relationships
	public function impression()
	{
		return $this->belongsTo('App\Models\Impression');
	}
}
