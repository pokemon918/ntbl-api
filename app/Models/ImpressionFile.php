<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImpressionFile extends Model
{
	protected $table = 'impression_files';
	protected $fillable = ['file_id', 'impression_id'];
	protected $auditKeys = ['file_id', 'impression_id'];
	public $timestamps = false;

	public static $rules = [
		'file_id' => 'required|integer|exists:file,id',
		'impression_id' => 'required|integer|exists:impression,id',
	];

	public function file()
	{
		return $this->hasOne('App\Models\File', 'id', 'file_id');
	}
}
