<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChargifyEvent extends Model
{
	protected $table = 'chargify_events';
	protected $primaryKey = 'webhook_id';
	public $incrementing = false;

	protected $fillable = ['webhook_id', 'event_type', 'event_body'];

	public static $rules = [
		'webhook_id' => 'required|numeric',
		'event_type' => 'required|string',
		'event_body' => 'required|json',
	];
}
