<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ImpressionInfoType extends Model
{
	protected $table = 'impression_info_type';
	protected $fillable = ['key', 'name'];
	public $hidden = ['id'];
	public $timestamps = false;

	public function impressionInfo()
	{
		return $this->belongsTo('App\Models\ImpressionInfo');
	}
}
