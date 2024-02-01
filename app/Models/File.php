<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class File extends Model
{
	protected $table = 'file';
	protected $fillable = ['ref', 'path', 'mime_type', 'file_name', 'file_ext'];

	public static $rules = [
		'ref' => 'string|max:32',
		'path' => 'string|max:255',
		'mime_type' => 'string|max:32',
		'file_name' => 'string|max:128',
		'file_ext' => 'string|max:32',
		'file_size' => 'integer',
	];

	public function impressionFile()
	{
		return $this->belongsTo('App\Models\ImpressionFile', 'id', 'file_id');
	}

	public function user()
	{
		return $this->belongsTo('App\Models\User', 'id', 'profile_id');
	}
}
