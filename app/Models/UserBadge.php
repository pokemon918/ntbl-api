<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserBadge extends Model
{
	protected $table = 'user_badges';
	protected $fillable = ['user_id', 'badge_id'];
	public $timestamps = false;

	public static $rules = [
		'key' => 'required|string|max:32|exists:badges,key',
	];

	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	public function badge()
	{
		return $this->hasOne('App\Models\Badge', 'id', 'badge_id');
	}
}
