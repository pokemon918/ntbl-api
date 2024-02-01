<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ImpressionInfo extends Model
{
	protected $table = 'impression_info';
	protected $fillable = ['impression_id', 'field', 'info', 'value'];
	public $hidden = ['id', 'impression_id'];
	public $timestamps = false;
	protected $casts = [
		'value' => 'float',
	];

	public static $rules = [
		'field' => 'required|string|max:64',
		'info' => 'required|string|max:64|exists:impression_info_value_type,key',
		'value' => 'required|numeric',
		'rating' => 'required|numeric|between:0,1|valid_rating',
	];

	public function impression()
	{
		return $this->belongsTo('App\Models\Impression');
	}
}
