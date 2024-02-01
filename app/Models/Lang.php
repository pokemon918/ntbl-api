<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lang extends Model
{
	protected $table = 'lang';
	protected $fillable = ['key'];
	public static $rules = ['key' => 'required|valid_ref|exists:lang,key'];

	// Relationships
	public function l18ns()
	{
		return $this->hasMany('App\Models\L18n', 'lang_id');
	}

	public function userPreferences()
	{
		return $this->belongsTo('App\Models\UserPreferences');
	}
}
