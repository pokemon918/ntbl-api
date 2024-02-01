<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SubscriptionPlan extends Model
{
	protected $table = 'subscription_plan';

	// Relationships
	public function userSubscription()
	{
		return $this->belongsTo('App\Models\UserSubscription');
	}
}
