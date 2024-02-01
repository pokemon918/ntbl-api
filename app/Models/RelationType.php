<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RelationType extends Model
{
	protected $table = 'relation_type';
	protected $fillable = ['key', 'name'];
	public $timestamps = false;

	public static $rules = [
		'key' => 'required|string|max:32',
		'name' => 'required|string|max:255',
	];

	public $hidden = ['id'];

	// Relationships
	public function relations()
	{
		return $this->hasMany('App\Models\TeamUser', 'relation_type_id');
	}
}
