<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserLanguage extends Model
{
	protected $table = 'user_language';
	protected $fillable = ['name'];
	public $timestamps = false;

	public static $rules = [
		'name' => 'required|string|max:255',
	];

	// Relationships
	public function demographic()
	{
		return $this->belongsTo('App\Models\UserDemographic');
	}
}
