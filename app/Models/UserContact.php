<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\File;

class UserContact extends Model
{
	protected $table = 'user_contact';
	protected $fillable = ['phone_prefix', 'phone', 'linkedin', 'twitter'];
	protected $hidden = ['user_id'];

	public static $rules = [
		'phone_prefix' => 'nullable|valid_phone_prefix|max:5',
		'phone' => 'nullable|valid_phone|max:15',
		'linkedin' => 'nullable|string|max:150|url',
		'twitter' => 'nullable|string|max:150|url',
	];

	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}
}
