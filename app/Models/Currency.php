<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class Currency extends Model
{
	protected $table = 'currency';

	public function userPreferences()
	{
		return $this->belongsTo('App\Models\UserPreferences');
	}
}
