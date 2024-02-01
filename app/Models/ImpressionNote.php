<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImpressionNote extends Model
{
	protected $table = 'impression_note';
	protected $fillable = ['impression_id', 'note_id', 'type'];
	protected $auditKeys = ['impression_id', 'note_id', 'type'];

	public $timestamps = false;
	public static $rules = [
		'impression_id' => 'required|integer|exists:impression,id',
		'note_id' => 'required|integer|exists:note,id',
		'type' => 'nullable|string',
	];

	// Relationships
	public function note()
	{
		return $this->belongsTo('App\Models\Note');
	}

	public function impression()
	{
		return $this->belongsTo('App\Models\Impression');
	}
}
