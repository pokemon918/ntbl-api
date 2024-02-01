<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserBilling extends Model
{
	protected $table = 'user_billing';
	protected $fillable = ['user_id', 'portal_link', 'expires_at'];
	protected $hidden = ['id', 'user_id'];

	public static $rules = [
		'user_id' => 'required|numeric|exists:user,id',
		'portal_link' => 'required|string|max:150|url',
		'expires_at' => 'required|date',
	];

	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}
}
