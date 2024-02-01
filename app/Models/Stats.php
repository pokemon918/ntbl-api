<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\ClientTime;

class Stats extends Model
{
	use SoftDeletes;
	use ClientTime;

	protected $table = 'stats';
	protected $fillable = [
		'impression_id',
		'event',
		'value',
		'created_ct',
		'updated_ct',
		'deleted_ct',
	];
	public static $rules = [
		'impression_id' => 'required|integer',
		'event' => 'max:32|valid_text',
		'value' => 'numeric',
		'created_ct' => 'date|after:1970-01-01',
		'updated_ct' => 'date|after:1970-01-01',
		'deleted_ct' => 'date|after:1970-01-01',
	];
	public $hidden = ['created_ct', 'updated_ct', 'deleted_ct'];

	// Relationships
	public function impression()
	{
		return $this->belongsTo('App\Models\Impression');
	}
}
