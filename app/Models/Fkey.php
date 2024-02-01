<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Fkey extends Model
{
	protected $table = 'fkey';
	protected $fillable = ['origin', 'subject_key', 'event_key', 'client_key', 'producer_key'];
	public $timestamps = false;

	public static $rules = [
		'origin' => 'required|string|validFkey|max:127',
		'subject_key' => 'required|string|validFkey|max:127',
		'event_key' => 'nullable|string|validFkey|max:127',
		'client_key' => 'nullable|string|validFkey|max:127',
		'producer_key' => 'nullable|string|validFkey|max:127',
	];

	public function impression()
	{
		return $this->belongsTo('App\Models\Impression');
	}
}
