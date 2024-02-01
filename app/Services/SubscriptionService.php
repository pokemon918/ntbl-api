<?php
namespace App\Services;

use Auth;
use Carbon\Carbon;
use App\Helpers\Commons;
use App\Helpers\StringHelper;
use App\Helpers\SubscriptionHelper;
use App\Models\UserSubscription;
use App\Models\SubscriptionPlan;
use App\Models\Voucher;
use App\Helpers\ValidationHelper;

class SubscriptionService
{
	private $errorCodes = [];
	private $ruleMessages = [];

	function __construct()
	{
		$this->errorCodes = config('app.errorCodes');
		$this->ruleMessages = config('app.ruleMessages');

		$this->subscriptionLifecycleActiveStates = config('subscription.local.states.live');
		$this->subscriptionLifecyclePendingStates = config('subscription.local.states.pending');
		$this->subscriptionLifecycleEndofLifeStates = config(
			'subscription.local.states.end_of_life'
		);

		$this->paidPlans = config('subscription.paid_plans');
		$this->defaultSubscriptionPlan = config('subscription.local.default_plan');
		$this->initialSubscriptionPlan = config('subscription.local.initial_plan');
		$this->basicToPro = config('subscription.basic_to_pro');
		$this->basicToProValidity = config('subscription.local.basic_to_pro_validity');

		$this->devVouchers = config('subscription.local.dev_vouchers');
		$this->voucherDefaultUsageLimitLocal = config(
			'subscription.local.voucher.default_usage_limit'
		);
		$this->voucherDefaultUsageLimitRemote = config(
			'subscription.chargify.voucher.default_usage_limit'
		);
		$this->voucherValidDays = config('subscription.local.voucher.valid_days');
		$this->signupForceScholar = config('subscription.signup_force_scholar');
	}

	public function create($user, $chargifySubscription)
	{
		$this->validateChargifySubscription($chargifySubscription);
		$subscription = $this->createSubscription($user, $chargifySubscription);
		return $this->refresh($subscription);
	}

	public function update($user, $chargifySubscription)
	{
		$this->validateChargifySubscription($chargifySubscription);
		$subscription = $this->updateSubscription($user, $chargifySubscription);
		return $this->refresh($subscription);
	}

	public function cancel($user, $chargifySubscription)
	{
		$this->validateCancelChargifySubscription($chargifySubscription);
		$this->cancelSubscription($user, $chargifySubscription);
		$subscription = $this->makeViewSubscription($user);
		return $subscription;
	}

	public function delayedCancel($user, $chargifySubscription)
	{
		$this->validateCancelChargifySubscription($chargifySubscription);
		$subscription = $this->delayedCancelSubscription($user, $chargifySubscription);
		return $subscription;
	}

	public function stopDelayedCancel($user, $chargifySubscription)
	{
		$this->validateCancelChargifySubscription($chargifySubscription);
		$subscription = $this->stopDelayedCancelSubscription($user, $chargifySubscription);
		return $subscription;
	}

	/**
	 * Extracts the current active remove subscription from the list of remote subscriptions.
	 *
	 * @return void
	 */
	public function extractCurrentActiveRemoteSubscription($remoteSubscriptions)
	{
		if (empty($remoteSubscriptions)) {
			return null;
		}

		$currentActiveRemoteSubscription = null;
		foreach ($remoteSubscriptions as $subscription) {
			$state = array_get($subscription, 'subscription.state');
			if (in_array($state, $this->subscriptionLifecycleActiveStates)) {
				$currentActiveRemoteSubscription = $subscription;
				break;
			}
		}

		return $currentActiveRemoteSubscription;
	}

	public function getRemoteUserSubscriptions($user)
	{
		$customer = SubscriptionHelper::getCustomerByRef($user->ref);
		$this->validateCustomerObject($customer, $user);
		$customerId = Commons::getProperty($customer['customer'], 'id');
		$subscriptions = SubscriptionHelper::getSubscriptions($customerId);
		return $subscriptions;
	}

	public function getSiteSubscriptions()
	{
		$rawSubscriptions = UserSubscription::with('user')
			->orderBy('updated_at', 'desc')
			->get();

		$subscriptions = [];

		foreach ($rawSubscriptions as $subscription) {
			if (!empty($subscription->user)) {
				array_push($subscriptions, $this->refresh($subscription));
			}
		}

		return $subscriptions;
	}

	public function getActiveSubscriptionByUserID($userID)
	{
		$subscription = UserSubscription::where('user_id', '=', $userID)
			->whereIn('status', $this->subscriptionLifecycleActiveStates)
			->whereNull('deleted_at')
			->orderBy('created_at', 'desc')
			->first();
		return $subscription;
	}

	public function addSignupSubscription($user, $voucher)
	{
		$initialSubscription = $this->addInitialUserSubscription($user);

		if ($this->signupForceScholar) {
			$this->addForcedScholarSubscription($user);
		}

		if (empty($voucher)) {
			return $initialSubscription;
		}

		// Check for dev vouchers
		$devVouchers = array_keys($this->devVouchers);
		if (DEV && in_array($voucher, $devVouchers)) {
			return $this->addUserSubscriptionByDevVoucher($user, $voucher);
		}

		// Check for "upgrade" vouchers
		$upgradeVoucher = Voucher::where([
			['code', '=', $voucher],
			['type', '=', 'upgrade'],
		])->first();

		if (!empty($upgradeVoucher)) {
			return $this->upgradeUserSubscription($user, $upgradeVoucher);
		}

		// Last stop: add a subscription by remote voucher
		return $this->addUserSubscriptionByVoucher(
			$user,
			$voucher,
			$this->voucherDefaultUsageLimitRemote
		);
	}

	public function addForcedScholarSubscription($user)
	{
		// Create a view subscription for the user
		$this->makeViewSubscription($user);

		// Create a 90 days scholar plan for the
		$subscription = $this->addUserSubscriptionUpgrade($user, 'scholar', 90);
		return $subscription;
	}

	public function addUserSubscriptionByDevVoucher($user, $voucher)
	{
		$this->validateDevVoucher($voucher);
		$planKey = $this->devVouchers[$voucher];
		$subscriptionPlan = $this->getSubscriptionPlan($planKey);
		$subscription = $user->getPaidActiveSubscription();

		// When signupForceScholar is enabled , the unlikely happens
		if (!$this->signupForceScholar) {
			// Highly unlikely, but do not overwrite anything that is currently considered active
			$this->validateHasActivePlan($user, $subscription);
		}

		// Save the voucher code
		$localVoucherObj = $this->saveVoucherCode($voucher, $planKey, 'dev', null);

		// Save the subscription
		$subscription = $this->addUserSubscription($user, $planKey);
		$subscription->end_date = Carbon::now()
			->addDays(30)
			->format('Y-m-d H:i:s');
		$subscription->voucher_id = $localVoucherObj->id;
		$subscription->save();

		return $this->refresh($subscription);
	}

	public function addUserSubscriptionByVoucher($user, $voucher, $usageLimit)
	{
		$remoteVoucherObj = SubscriptionHelper::findCoupon($voucher);
		$restrictions = $remoteVoucherObj['coupon_restrictions'];
		$planKey = $restrictions[0]['handle'];
		$localVoucherObj = $this->saveVoucherCode(
			$remoteVoucherObj['code'],
			$planKey,
			'remote',
			$usageLimit
		);
		$subscription = $this->addUserSubscription($user, $planKey, $localVoucherObj);

		return $this->refresh($subscription);
	}

	public function saveVoucherCode($code, $planKey, $type, $usageLimit)
	{
		$localVoucherObj = Voucher::where('code', '=', $code)->first();

		if (!empty($localVoucherObj)) {
			return $localVoucherObj;
		}

		$localVoucherObj = new Voucher();
		$localVoucherObj->code = strtoupper($code);
		$localVoucherObj->plan = $planKey;
		$localVoucherObj->type = $type;
		$localVoucherObj->usage_limit = $usageLimit;
		$localVoucherObj->save();

		return $localVoucherObj;
	}

	public function upgradeUserSubscription($user, $upgradeVoucher)
	{
		/*
			As of 10/19/2019, this function only supports the creation of new subscription meaning when the voucher is sent in the signup.
			Todo: Add a functionality later that could upgrade the user's current plan based on the $upgradeVoucher 
		*/
		$subscription = $this->addUserSubscription($user, $upgradeVoucher->plan, $upgradeVoucher);
		return $this->refresh($subscription);
	}

	public function addInitialUserSubscription($user)
	{
		$subscription = $user->getPaidActiveSubscription();

		// Do not overwrite anything that is currently considered active
		$this->validateHasActivePlan($user, $subscription);

		// Operation Specifics
		$subscription = $this->addUserSubscriptionUpgrade($user, $this->initialSubscriptionPlan);
		return $this->refresh($subscription);
	}

	/*
		todo: create a function addUserSubscriptionUpgrade
		Add the logic of upgrading a subscription in this function
	*/
	public function addUserSubscriptionUpgrade($user, $plan, $validDays = null, $voucherID = null)
	{
		$subscriptionPlan = $this->getSubscriptionPlan($plan);
		$subscription = $this->baseSubscription($user);
		$subscription->plan_id = $subscriptionPlan->id;
		$subscription->start_date = Carbon::now()->format('Y-m-d H:i:s');
		$subscription->status = $plan == $this->initialSubscriptionPlan ? 'new' : 'active';

		if (!empty($voucherID)) {
			$subscription->voucher_id = $voucherID;
		}

		if (!empty($validDays)) {
			if ($validDays !== -1) {
				$subscription->end_date = Carbon::now()
					->addDays($validDays)
					->format('Y-m-d H:i:s');
			}
		}

		$subscription->save();
		return $subscription;
	}

	public function addUserSubscription($user, $plan, $voucherObj = null)
	{
		if (!empty($voucherObj)) {
			$subscription = $this->addUserSubscriptionUpgrade(
				$user,
				$plan,
				$voucherObj->valid_days,
				$voucherObj->id
			);
		} else {
			$subscription = $this->addUserSubscriptionUpgrade($user, $plan);
		}
		return $subscription;
	}

	public function createSubscription($user, $chargifySubscription)
	{
		$subscriptionId = array_get($chargifySubscription, 'subscription.id');
		$status = array_get($chargifySubscription, 'subscription.state');
		$endAt = array_get($chargifySubscription, 'subscription.expires_at');
		$canceledAt = array_get($chargifySubscription, 'subscription.canceled_at');
		$delayedCancelAt = array_get($chargifySubscription, 'subscription.delayed_cancel_at');
		$subscriptionPlanKey = array_get($chargifySubscription, 'subscription.product.handle');

		// Check whether remote subscription has already been created locally or not. If so, simply return it
		$activePlan = $this->getByID($subscriptionId);
		if (!empty($activePlan)) {
			return $activePlan;
		}

		// Validate some remote customer fields with local user fields
		$customerEmail = array_get($chargifySubscription, 'subscription.customer.email');
		$this->validateCustomer($customerEmail, $user->email);
		$this->validateTrialPeriod($user, $chargifySubscription);

		// Add a the user subscription and make sure to update the id and status based on the remote values
		$subscription = $this->addUserSubscription($user, $subscriptionPlanKey);
		$subscription->subscription_id = $subscriptionId;
		$subscription->status = $status;
		$subscription->end_date = !empty($endAt)
			? Carbon::parse($endAt)->format('Y-m-d H:i:s')
			: null;
		$subscription->canceled_at = !empty($canceledAt)
			? Carbon::parse($canceledAt)->format('Y-m-d H:i:s')
			: null;
		$subscription->delayed_cancel_at = !empty($delayedCancelAt)
			? Carbon::parse($delayedCancelAt)->format('Y-m-d H:i:s')
			: null;
		$subscription->save();

		//save the user's customer id
		$user->customer_id = array_get($chargifySubscription, 'subscription.customer.id');
		$user->save();

		if ($subscriptionPlanKey == 'basic') {
			$subscription = $this->basicToProUpgrade($user, $subscription, $subscriptionPlanKey);
		}

		// Make sure to update the initial subscription as subscribed, after successfully creating a subscription for the user and/or upgrading his subscriptions
		$initialSubscription = $user->getInitialSubscription();
		if (!empty($initialSubscription)) {
			$initialSubscription->status = 'subscribed';
			$initialSubscription->save();
		}

		return $subscription;
	}

	private function basicToProUpgrade($user, $subscription, $subscriptionPlanKey)
	{
		// Check if the user is new and has a default subscription
		if (!$this->isEligibleForBasicToProUpgrade($user, $subscription, $subscriptionPlanKey)) {
			return $subscription;
		}

		// Give the user an upgraded subscription
		$upgradeSubscription = $this->addUserSubscriptionUpgrade(
			$user,
			'pro',
			$this->basicToProValidity
		);
		$upgradeSubscription->future_plan = $subscriptionPlanKey;
		$upgradeSubscription->save();
		return $upgradeSubscription;
	}

	private function isEligibleForBasicToProUpgrade($user, $subscriptionPlanKey)
	{
		// hardcode that we dont upgrade basic to pro because we have a bug with 6m and 12m payments that does not upgrade - but now we need to get out
		// todo: Make sure we can use a .env to set if basic is upgraded first 30 days.
		if (!$this->basicToPro) {
			return false;
		}

		$initialSubscription = $user->getInitialSubscription();

		// The user must have selected the basic plan and must be a newly signed up user with a "subscribe" plan and "new" status
		if ($subscriptionPlanKey == 'basic' || !empty($initialSubscription)) {
			return true;
		}

		return false;
	}

	private function getByID($subscriptionId)
	{
		return UserSubscription::where('subscription_id', '=', $subscriptionId)
			->whereNull('deleted_at')
			->first();
	}

	public function cancelSubscription($user, $chargifySubscription)
	{
		$subscription = $this->updateSubscription($user, $chargifySubscription);
		//set the user's customer_id to null locally to avoid issues later on
		$user->customer_id = null;
		$user->save();
		return $this->refresh($subscription);
	}

	public function delayedCancelSubscription($user, $chargifySubscription)
	{
		$subscription = $this->updateSubscription($user, $chargifySubscription);
		return $this->refresh($subscription);
	}

	public function stopDelayedCancelSubscription($user, $chargifySubscription)
	{
		$subscription = $this->updateSubscription($user, $chargifySubscription);
		return $this->refresh($subscription);
	}

	public function makeViewSubscription($user)
	{
		// If the user already has a view subscription, simply return it, else create a new one
		$subscription = $user->getViewSubscription();

		if (!empty($subscription)) {
			return $this->refresh($subscription);
		}

		$plan = $this->getSubscriptionPlan($this->defaultSubscriptionPlan);
		$subscription = $this->baseSubscription($user);
		$subscription->plan_id = $plan->id;
		$subscription->start_date = Carbon::now()->format('Y-m-d H:i:s');
		$subscription->status = 'active';
		$subscription->save();
		return $this->refresh($subscription);
	}

	public function getSubscriptionPlan($planKey)
	{
		$plan = SubscriptionPlan::whereRaw(
			"'" . preg_replace('/[^A-Za-z0-9_-]/', '', $planKey) . "'" . "LIKE CONCAT(`key`,'%')"
		)->first();

		$this->validateSubscriptionPlan($plan, $planKey);
		return $plan;
	}

	public function updateStatus($subscriptionId, $status)
	{
		$subscription = $this->getByID($subscriptionId);

		if (empty($subscription)) {
			return false;
		}

		$subscription->status = $status;
		$subscription->save();
	}

	public function addVouchers($vouchers, $plan)
	{
		$voucherObjs = [];

		if (empty($vouchers) || !is_array($vouchers)) {
			return $voucherObjs;
		}

		foreach ($vouchers as $voucher) {
			$voucherObj = [
				'code' => strtoupper(array_get($voucher, 'code')),
				'valid_days' => array_get($voucher, 'valid_days'),
				'type' => 'upgrade',
				'usage_limit' => array_get(
					$voucher,
					'usage_limit',
					$this->voucherDefaultUsageLimitLocal
				),
				'created_at' => Carbon::now(),
				'updated_at' => Carbon::now(),
				'plan' => $plan,
			];
			array_push($voucherObjs, $voucherObj);
		}

		Voucher::insert($voucherObjs);
		return $voucherObjs;
	}

	public function validateVouchersPayload($payload)
	{
		ValidationHelper::validatePayload($payload);
		$plan = Commons::getProperty($payload, 'plan');
		$vouchers = Commons::getProperty($payload, 'vouchers');
		$this->validatePlan($plan);
		$this->validateVouchers($vouchers);
	}

	private function validatePlan($plan)
	{
		if (empty($plan)) {
			ValidationHelper::fail(
				'Plan is empty or invalid',
				$this->errorCodes['invalid_payload'],
				'plan',
				__FILE__,
				__LINE__,
				[]
			);
		}

		if (!in_array($plan, $this->paidPlans)) {
			ValidationHelper::fail(
				'Plan does not exists or invalid',
				$this->errorCodes['invalid_payload'],
				'plan',
				__FILE__,
				__LINE__,
				[]
			);
		}
	}

	private function validateVouchers($vouchers)
	{
		if (empty($vouchers) || !is_array($vouchers)) {
			ValidationHelper::fail(
				'Vouchers are empty or invalid',
				$this->errorCodes['invalid_payload'],
				'vouchers',
				__FILE__,
				__LINE__,
				[]
			);
		}

		$voucherCodes = [];
		foreach ($vouchers as $voucher) {
			ValidationHelper::validateWithRules(
				[
					'voucher' => array_get($voucher, 'code'),
					'valid_days' => array_get($voucher, 'valid_days'),
					'usage_limit' => array_get($voucher, 'usage_limit'),
				],
				[
					'voucher' => 'required|string|max:20|valid_voucher_code',
					'valid_days' => Voucher::$rules['valid_days'],
					'usage_limit' => Voucher::$rules['usage_limit'],
				]
			);
			$voucherCodes[] = array_get($voucher, 'code');
		}

		// Optimization on unique:voucher,code
		$vouchersDB = Voucher::select('code')
			->whereIn('code', $voucherCodes)
			->pluck('code')
			->toArray();

		if (!empty($vouchersDB)) {
			ValidationHelper::fail(
				'Voucher codes: [' . implode(', ', $vouchersDB) . '] already exists.',
				$this->errorCodes['invalid_payload'],
				'vouchers',
				__FILE__,
				__LINE__,
				$voucherCodes
			);
		}
	}

	public function validateVoucher($voucher)
	{
		if (empty(trim($voucher))) {
			return;
		}

		// Check if the voucher is a dev voucher; If so, do not proceed with remote voucher validation
		$devVouchers = array_keys($this->devVouchers);
		if (DEV && in_array($voucher, $devVouchers)) {
			return;
		}

		// Validate the voucher limit regardless of what type of voucher has been sent
		$this->validateVoucherUsageLimit($voucher);

		// Check if the voucher is an "upgrade" voucher; If so, do not proceed with remote voucher validation
		$upgradeVoucher = Voucher::where([
			['code', '=', $voucher],
			['type', '=', 'upgrade'],
		])->first();

		if (!empty($upgradeVoucher)) {
			return;
		}

		// If the voucher is not a dev or upgrade voucher, assume that its a remote voucher and validate it
		SubscriptionHelper::validateVoucher($voucher);
	}

	public function validateVoucherUsageLimit($voucher)
	{
		$localVoucherObj = Voucher::where([['code', '=', $voucher]])->first();

		if (empty($localVoucherObj) || $localVoucherObj->usage_limit == -1) {
			return;
		}

		// Get all subscriptions by voucher_id
		$subscriptions = UserSubscription::where([['voucher_id', '=', $localVoucherObj->id]])
			->whereNull('deleted_at')
			->get();

		$numOfSubscriptionsUsingTheVoucher = count($subscriptions);

		/*
			If the number of subscriptions that has used the voucher is equal to the usage limit, 
			then it means that the voucher has reached its usage limit. Thus, throw an error
		*/

		if ($numOfSubscriptionsUsingTheVoucher == $localVoucherObj->usage_limit) {
			ValidationHelper::fail(
				$this->ruleMessages['voucher_limit'],
				$this->errorCodes['voucher_limit'],
				'',
				__FILE__,
				__LINE__,
				[
					'localVoucherObj' => $localVoucherObj,
					'numOfSubscriptionsUsingTheVoucher' => $numOfSubscriptionsUsingTheVoucher,
				]
			);
		}
	}

	public function validateCurrentActiveRemoteSubscription($currentActiveRemoteSubscription, $user)
	{
		if (empty($currentActiveRemoteSubscription)) {
			ValidationHelper::fail(
				'Unable to find an active remote subscription.',
				$this->errorCodes['exists'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
				]
			);
		}
	}

	private function baseSubscription($user, $subscriptionId = null)
	{
		$subscription = new UserSubscription();
		$subscription->subscription_id = $subscriptionId;
		$subscription->user_id = $user->id;
		return $subscription;
	}

	public function refresh($subscription)
	{
		if (empty($subscription)) {
			return $subscription;
		}

		$subscription = $subscription->fresh();
		$subscription->active_plan = $subscription->subscriptionPlan->key;
		return $subscription;
	}

	private function updateSubscription($user, $chargifySubscription)
	{
		$subscriptionId = array_get($chargifySubscription, 'subscription.id');
		$status = array_get($chargifySubscription, 'subscription.state');
		$createdAt = array_get($chargifySubscription, 'subscription.created_at');
		$endAt = array_get($chargifySubscription, 'subscription.expires_at');
		$canceledAt = array_get($chargifySubscription, 'subscription.canceled_at');
		$delayedCancelAt = array_get($chargifySubscription, 'subscription.delayed_cancel_at');
		$newSubscriptionPlanKey = array_get($chargifySubscription, 'subscription.product.handle');

		$customerEmail = array_get($chargifySubscription, 'subscription.customer.email');
		$this->validateCustomer($customerEmail, $user->email);

		// Get the subscription plan
		$subscriptionPlan = $this->getSubscriptionPlan($newSubscriptionPlanKey);

		// One user One subscription design , adding specific search when out of sync will result in an constraint error
		$subscription = $this->getByID($subscriptionId);

		if (empty($subscription)) {
			$subscription = $this->createSubscription($user, $chargifySubscription);
			return $subscription;
		}

		// Operation Specifics
		$subscription->subscription_id = $subscriptionId;
		$subscription->status = $status;
		$subscription->plan_id = $subscriptionPlan->id;
		$subscription->end_date = !empty($endAt)
			? Carbon::parse($endAt)->format('Y-m-d H:i:s')
			: null;
		$subscription->canceled_at = !empty($canceledAt)
			? Carbon::parse($canceledAt)->format('Y-m-d H:i:s')
			: null;
		$subscription->delayed_cancel_at = !empty($delayedCancelAt)
			? Carbon::parse($delayedCancelAt)->format('Y-m-d H:i:s')
			: null;
		$subscription->save();
		return $subscription;
	}

	private function validateActivePlan($user, $subscription)
	{
		if (empty($subscription)) {
			ValidationHelper::fail(
				'Subscription not found.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
				]
			);
		}
	}

	private function validateSubscriptionPlan($plan, $planKey)
	{
		if (empty($plan)) {
			ValidationHelper::fail(
				'Subscription plan not found.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'membership_plan' => $planKey,
				]
			);
		}
	}

	private function validateCustomerObject($customer, $user)
	{
		if (empty($customer)) {
			ValidationHelper::fail(
				'Customer not found.',
				$this->errorCodes['exists'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
				]
			);
		}
	}

	private function validateCustomer($customerEmail, $userEmail)
	{
		//The customer email and the current user's email must match
		if ($customerEmail != $userEmail) {
			ValidationHelper::fail(
				'Customer and user email does not match.',
				$this->errorCodes['subscription_error_local'],
				'',
				__FILE__,
				__LINE__,
				[
					'customerEmail' => $customerEmail,
					'userEmail' => $userEmail,
				]
			);
		}
	}

	private function validateTrialPeriod($user, $chargifySubscription)
	{
		$status = array_get($chargifySubscription, 'subscription.state');

		// A user can only use their trial once
		if ($status == 'trialing' && $user->used_trial) {
			ValidationHelper::fail(
				'User has already consumed his/her trial period.',
				$this->errorCodes['subscription_error_local'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user,
					'chargifySubscription' => $chargifySubscription,
				]
			);
		}
	}

	private function validateHasActivePlan($user, $subscription)
	{
		if (!empty($subscription)) {
			if (in_array($subscription->status, $this->subscriptionLifecycleActiveStates)) {
				ValidationHelper::fail(
					'User currently has active subscription.',
					$this->errorCodes['subscription_error_local'],
					'',
					__FILE__,
					__LINE__,
					[
						'user' => $user['ref'],
						'subscription' => $subscription,
					]
				);
			}
		}
	}

	private function validateChargifySubscription($subscription, $rules = '')
	{
		if (empty(array_get($subscription, 'subscription.id'))) {
			ValidationHelper::fail(
				'Subscription error occured.',
				$this->errorCodes['subscription_error_local'],
				'',
				__FILE__,
				__LINE__,
				['chargify_subscription' => $subscription]
			);
		}

		if ($rules) {
			$subscriptionId = array_get($subscription, 'subscription.id');
			ValidationHelper::validateWithRules(
				['remote_subscription' => $subscriptionId],
				['remote_subscription' => $rules]
			);
		}
	}

	private function validateCancelChargifySubscription($subscription)
	{
		$subscriptionId = array_get($subscription, 'subscription.id');
		$status = array_get($subscription, 'subscription.state');
		$createdAt = array_get($subscription, 'subscription.created_at');

		if (empty($subscriptionId) || empty($status) || empty($createdAt)) {
			ValidationHelper::fail(
				'Subscription error occured.',
				$this->errorCodes['subscription_error_local'],
				'',
				__FILE__,
				__LINE__,
				['chargify_subscription' => $subscription]
			);
		}
	}

	private function validateDelayedCancelChargifySubscription($subscription)
	{
		$subscriptionId = array_get($subscription, 'subscription.id');
		$status = array_get($subscription, 'subscription.state');
		$createdAt = array_get($subscription, 'subscription.created_at');
		$delayedCancelAt = array_get($subscription, 'subscription.delayed_cancel_at');

		if (
			empty($subscriptionId) ||
			empty($status) ||
			empty($createdAt) ||
			empty($delayedCancelAt)
		) {
			ValidationHelper::fail(
				'Subscription error occured.',
				$this->errorCodes['subscription_error_local'],
				'',
				__FILE__,
				__LINE__,
				['chargify_subscription' => $subscription]
			);
		}
	}

	private function validateDevVoucher($voucher)
	{
		$devVouchers = array_keys($this->devVouchers);
		if (!in_array($voucher, $devVouchers)) {
			ValidationHelper::fail(
				'Invalid voucher code.',
				$this->errorCodes['invalid_voucher'],
				'',
				__FILE__,
				__LINE__,
				['voucher' => $voucher]
			);
		}
	}
}
