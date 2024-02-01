<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
	protected $table = 'feedback';
	protected $fillable = ['name', 'email', 'message'];

	public static $rules = [
		'name' => 'required|string|max:255',
		'email' => 'required|email|max:255',
		'message' => 'required|string|max:4000',
	];
}
