<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserSubscription extends Model
{
	use SoftDeletes;

	protected $table = 'user_subscription';
	public $timestamps = true;

	public $hidden = [
		'id',
		'user_id',
		'subscription_id',
		'plan_id',
		'voucher_id',
		'used_trial',
		'deleted_at',
		'user',
		'subscriptionPlan',
		'weight',
	];

	protected $fillable = [
		'subscription_id',
		'type_id',
		'user_id',
		'voucher_id',
		'start_date',
		'end_date',
		'status',
		'used_trial',
	];

	public static $rules = [
		'subscription_id' => 'required|numeric',
		'membership_plan' => 'required|numeric|exists:membership_plan,',
		'status' => 'required|string',
		'user' => 'required|string|valid_ref|exists:user,ref',
		'voucher' => 'string|valid_ref', // todo : exists voucher table
		'start_date' => 'required|date|after:2019-01-01',
		'end_date' => 'required|date|after:2019-01-01|after:today',
		'used_trial' => 'boolean',
	];

	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	public function subscriptionPlan()
	{
		return $this->hasOne('App\Models\SubscriptionPlan', 'id', 'plan_id');
	}

	public function voucher()
	{
		return $this->hasOne('App\Models\Voucher', 'id', 'voucher_id');
	}
}
