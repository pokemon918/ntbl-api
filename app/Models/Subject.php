<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\ClientTime;

class Subject extends Model
{
	use SoftDeletes;
	use ClientTime;

	protected $table = 'subject';
	protected $fillable = [
		'impression_id',
		'name',
		'producer',
		'country',
		'region',
		'vintage',
		'grape',
		'created_ct',
		'updated_ct',
		'deleted_ct',
	];
	public static $rules = [
		'impression_id' => 'required|integer',
		'name' => 'max:128|valid_subject_name',
		'producer' => 'max:128|valid_subject_name',
		'country' => 'max:64|valid_text',
		'region' => 'max:255|valid_region',
		'vintage' => 'max:64|valid_text', // todo: only int
		'grape' => 'max:128|valid_text',
		'price' => 'numeric|valid_price',
		'currency' => 'string|max:16',
		'clean_key' => 'nullable|string|max:64',
		'producer_key' => 'nullable|string|max:64',
		'country_key' => 'nullable|string|max:64',
		'region_key' => 'nullable|string|max:64',
		'created_ct' => 'date|after:1970-01-01',
		'updated_ct' => 'date|after:1970-01-01',
		'deleted_ct' => 'date|after:1970-01-01',
	];
	public $hidden = ['created_ct', 'updated_ct', 'deleted_ct'];

	// Relationships
	public function impression()
	{
		return $this->hasOne('App\Models\Impression', 'subject_id');
	}
}
