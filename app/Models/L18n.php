<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class L18n extends Model
{
	protected $table = 'l18n';
	protected $fillable = ['lang_id', 'val'];

	public static $rules = [
		'ref' => 'string|max:255|valid_ref|unique:user,ref',
		'lang_id' => 'required',
		'val' => 'required|non_print_or_tags',
	];

	// Relationships
	public function noteL18ns()
	{
		return $this->hasMany('App\Models\NoteL18n', 'l18n_id');
	}

	public function lang()
	{
		return $this->belongsTo('App\Models\Lang');
	}
}
