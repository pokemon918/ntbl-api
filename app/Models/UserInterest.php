<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserInterest extends Model
{
	use SoftDeletes;
	protected $table = 'user_interest';
	protected $fillable = ['value'];
	public $timestamps = false;

	public static $rules = [
		'value' => 'required|string|max:255',
		'key' => 'required|string|max:16|valid_ref|exists:user_interest_type,key',
	];

	public function userInterestRelation()
	{
		return $this->belongsTo('App\Models\UserInterestRelation');
	}
}
