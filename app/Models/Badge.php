<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class Badge extends Model
{
	protected $table = 'badges';
	public $timestamps = false;

	public function userBadge()
	{
		return $this->belongsTo('App\Models\UserBadge');
	}
}
