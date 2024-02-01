<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserPreferences extends Model
{
	protected $table = 'user_preferences';

	public static $rules = [
		'lang' => 'filled|string|max:3|exists:lang,key',
		'currency' => 'filled|string|max:3|exists:currency,key',
	];

	protected $hidden = ['user_id'];

	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	public function preferredLang()
	{
		return $this->hasOne('App\Models\Lang', 'id', 'lang');
	}

	public function preferredCurrency()
	{
		return $this->hasOne('App\Models\Currency', 'id', 'currency');
	}
}
