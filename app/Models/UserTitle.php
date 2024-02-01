<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserTitle extends Model
{
	protected $table = 'user_title';
	protected $fillable = ['key'];

	public static $rules = [
		'key' => 'string|max:16|valid_ref|exists:user_title,key',
	];

	public function userWineKnowledge()
	{
		return $this->belongsTo('App\Models\UserWineKnowledge');
	}
}
