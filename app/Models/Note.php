<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
	protected $table = 'note';
	protected $fillable = ['key'];
	public static $rules = ['key' => 'required|max:64|valid_ref'];

	// Relationships
	public function noteL18ns()
	{
		return $this->hasMany('App\Models\NoteL18n', 'note_id');
	}

	public function impressionNotes()
	{
		return $this->hasMany('App\Models\ImpressionNote', 'note_id');
	}

	public static function getNoteByKey($key)
	{
		return Note::with(['noteL18ns', 'noteL18ns.l18n', 'noteL18ns.l18n.lang'])
			->where('key', '=', $key)
			->first();
	}

	public static function getNotesByKeys($keys)
	{
		return Note::with(['noteL18ns', 'noteL18ns.l18n', 'noteL18ns.l18n.lang'])
			->whereIn('key', $keys)
			->get();
	}
}
