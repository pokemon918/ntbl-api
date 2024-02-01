<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\ClientTime;

class Identity extends Model
{
	use SoftDeletes;
	use ClientTime;

	protected $table = 'identity';
	protected $fillable = [
		'handle',
		'name',
		'email',
		'hpass',
		'created_ct',
		'updated_ct',
		'deleted_ct',
	];
	public static $rules = [
		'email' => 'required|max:255|unique:identity,email|valid_email',
		'hpass' => 'required|string|max:64|sha256',
		'iterations' => 'required|numeric|between:15000,50000',
		'created_ct' => 'date|after:1970-01-01',
		'updated_ct' => 'date|after:1970-01-01',
		'deleted_ct' => 'date|after:1970-01-01',
	];
	public $hidden = ['created_ct', 'updated_ct', 'deleted_ct'];

	// Relationships
	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	public static function getByEmail($email)
	{
		return Identity::where('email', '=', $email)
			->join('user', 'identity.user_id', '=', 'user.id')
			->whereNull('identity.deleted_at')
			->first();
	}

	public static function getSpecsByEmail($email)
	{
		return Identity::select('identity.salt', 'identity.iterations', 'user.ref')
			->where('identity.email', '=', $email)
			->join('user', 'user.id', '=', 'identity.user_id')
			->whereNull('identity.deleted_at')
			->first();
	}
}
