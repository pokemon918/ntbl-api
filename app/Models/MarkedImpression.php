<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarkedImpression extends Model
{
	protected $table = 'marked_impressions';
	protected $fillable = ['user_id', 'impression_id'];
	public static $rules = [
		'user_ref' => 'required|valid_ref',
		'impression_ref' => 'required|valid_ref',
	];

	public $hidden = ['id', 'user_id', 'impression_id'];

	// Relationships
	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	public function impression()
	{
		return $this->belongsTo('App\Models\Impression');
	}
}
