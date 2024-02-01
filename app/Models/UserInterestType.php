<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserInterestType extends Model
{
	protected $table = 'user_interest_type';
	protected $fillable = ['key', 'name'];
	public $timestamps = false;

	public static $rules = [
		'key' => 'required|string|max:16|valid_ref',
		'name' => 'required|string|max:255',
	];

	public function userInterestRelation()
	{
		return $this->belongsTo('App\Models\UserInterestRelation');
	}
}
