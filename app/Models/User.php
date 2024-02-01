<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Traits\ClientTime;
use App\Models\File;
use App\Models\SubscriptionPlan;

class User extends Model
{
	use SoftDeletes;
	use ClientTime;

	protected $table = 'user';
	protected $fillable = [
		'name',
		'handle',
		'birth_date',
		'gdpr_consent',
		'avatar',
		'created_ct',
		'updated_ct',
		'deleted_ct',
	];
	public static $rules = [
		'name' => 'nullable|string|max:255|validUserName',
		'handle' => 'nullable|string|max:255|valid_handle|unique:user,handle',
		'birth_date' => 'nullable|date',
		'gdpr_consent' => 'nullable|date',
		'avatar' => 'nullable|file',
		'educations' => 'nullable|array|max:5',
		'languages' => 'nullable|array|max:5',
		'interests' => 'nullable|array',
		'created_ct' => 'date|after:1970-01-01',
		'updated_ct' => 'date|after:1970-01-01',
		'deleted_ct' => 'date|after:1970-01-01',
	];
	public $hidden = [
		'id',
		'used_trial',
		'customer_id',
		'deleted_at',
		'created_ct',
		'updated_ct',
		'deleted_ct',
	];

	public static function getUserByRef($ref)
	{
		return User::where('ref', $ref)
			->join('identity', 'identity.user_id', '=', 'user.id')
			->whereNull('user.deleted_at')
			->first();
	}

	public static function getUserByHandle($handle)
	{
		return User::where('handle', $handle)
			->join('identity', 'identity.user_id', '=', 'user.id')
			->whereNull('user.deleted_at')
			->first();
	}

	public static function getTeams($userid)
	{
		$teams = DB::table('team_user')
			->select(['team.ref', 'team.name', 'team.handle', 'team.description', 'team.public'])
			->where('user_id', '=', $userid)
			->whereNull('team_user.deleted_at')
			->join('team', 'team_user.team_id', '=', 'team.id')
			->whereNull('team.deleted_at')
			->get();
		return $teams;
	}

	public function getPaidActiveSubscription($remoteOnly = false)
	{
		$paidActiveSubscription = $this->subscriptions()
			->select(
				'user_subscription.*',
				'subscription_plan.key as active_plan',
				'subscription_plan.weight'
			)
			->whereIn('status', config('subscription.local.states.live'))
			->whereNull('user_subscription.deleted_at')
			->whereIn('subscription_plan.key', config('subscription.paid_plans'))
			->whereRaw(
				'(start_date IS NULL OR start_date <= now()) AND (end_date > now() OR end_date IS NULL)'
			)
			->when($remoteOnly, function ($q) {
				return $q->whereNotNull('subscription_id');
			})
			->join('subscription_plan', 'subscription_plan.id', 'user_subscription.plan_id')
			->orderBy('subscription_plan.weight', 'DESC')
			->orderBy('updated_at', 'DESC')
			->first();

		return $paidActiveSubscription;
	}

	public function getViewSubscription()
	{
		$plan = SubscriptionPlan::where('key', '=', 'view')->first();
		$viewSubscription = $this->subscriptions()
			->where('plan_id', '=', $plan->id)
			->whereIn('status', config('subscription.local.states.live'))
			->orderBy('created_at', 'DESC')
			->first();
		return $viewSubscription;
	}

	public function getInitialSubscription($subscribed = false)
	{
		$status = $subscribed ? 'subscribed' : 'new';
		$plan = SubscriptionPlan::where('key', '=', 'subscribe')->first();
		$initialSubscription = $this->subscriptions()
			->where([
				['plan_id', '=', $plan->id],
				['status', '=', $status],
				['subscription_id', '=', null],
			])
			->orderBy('created_at', 'DESC')
			->first();

		return $initialSubscription;
	}

	// This automagically converts empty strings to null for Identity->handle
	public function setHandleAttribute($value)
	{
		$this->attributes['handle'] = $value ?: null;
	}

	// Relationships
	public function relations()
	{
		return $this->hasMany('App\Models\TeamUser', 'user_id');
	}

	public function identity()
	{
		return $this->hasOne('App\Models\Identity', 'user_id');
	}

	public function avatar()
	{
		return $this->hasOne('App\Models\File', 'id', 'avatar');
	}

	public function contact()
	{
		return $this->hasOne('App\Models\UserContact', 'user_id');
	}

	public function wineKnowledge()
	{
		return $this->hasOne('App\Models\UserWineKnowledge', 'user_id');
	}

	public function educations()
	{
		return $this->hasMany('App\Models\UserEducation', 'user_id');
	}

	public function demographic()
	{
		return $this->hasOne('App\Models\UserDemographic', 'user_id');
	}

	public function collectionFeatured()
	{
		return $this->belongsTo('App\Models\CollectionFeatured');
	}

	public function preferences()
	{
		return $this->hasOne('App\Models\UserPreferences', 'user_id');
	}

	public function interestRelations()
	{
		return $this->hasMany('App\Models\UserInterestRelation', 'user_id');
	}

	public function userBadges()
	{
		return $this->hasMany('App\Models\UserBadge', 'user_id');
	}

	public function teamActions()
	{
		return $this->hasMany('App\Models\TeamAction', 'user_id');
	}

	public function subscriptions()
	{
		return $this->hasMany('App\Models\UserSubscription', 'user_id');
	}

	public function markedImpressions()
	{
		return $this->hasMany('App\Models\MarkedImpression', 'user_id', 'id');
	}

	public function teamUserRelations()
	{
		return $this->hasMany('App\Models\TeamUser', 'user_id');
	}
}
