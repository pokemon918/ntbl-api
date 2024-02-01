<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserWineKnowledge extends Model
{
	protected $table = 'user_wine_knowledge';
	protected $fillable = ['title_key'];
	protected $hidden = ['user_id'];

	public static $rules = [
		'user_title' => 'string|max:16|exists:user_title,key',
	];

	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	public function title()
	{
		return $this->hasOne('App\Models\UserTitle', 'key', 'title_key');
	}
}
