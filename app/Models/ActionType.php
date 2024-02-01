<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActionType extends Model
{
	protected $table = 'action_type';
	public $timestamps = false;

	public static $rules = [
		'key' => 'required|string|max:32',
		'name' => 'required|string|max:255',
	];

	public $hidden = ['id'];

	// Relationships
	public function teamAction()
	{
		return $this->belongsTo('App\Models\TeamAction');
	}
}
