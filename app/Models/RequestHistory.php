<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RequestHistory extends Model
{
	protected $table = 'request_history';
	protected $fillable = ['user_ref', 'client_time', 'who'];
	public $timestamps = false;

	public static $rules = [
		'user_ref' => 'required|string|max:32|valid_ref|exists:user,ref',
		'client_time' => 'required|numeric',
		'who' => 'required|string',
	];
}
