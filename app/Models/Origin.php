<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Origin extends Model
{
	protected $table = 'origin';
	protected $fillable = ['flow', 'client', 'version'];

	public $timestamps = false;
	public static $rules = [
		'flow' => 'required|max:16|non_print_or_tags',
		'client' => 'required|max:32|valid_client',
		'version' => 'required|max:16|valid_version',
	];

	// Relationships
	public function impressions()
	{
		return $this->hasMany('App\Models\Impression', 'origin_id');
	}
}
