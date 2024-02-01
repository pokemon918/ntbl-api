<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NoteL18n extends Model
{
	protected $table = 'note_l18n';
	protected $fillable = ['note_id', 'l18n_id'];
	protected $auditKeys = ['note_id', 'l18n_id'];
	public static $rules = ['note_id' => 'required', 'l18n_id' => 'required'];

	// Relationships
	public function note()
	{
		return $this->belongsTo('App\Models\Note');
	}

	public function l18n()
	{
		return $this->belongsTo('App\Models\L18n');
	}
}
