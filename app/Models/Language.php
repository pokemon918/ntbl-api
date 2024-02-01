<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class Language extends Model
{
	protected $table = 'language';

	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}
}
