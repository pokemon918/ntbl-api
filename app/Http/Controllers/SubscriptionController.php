<?php
namespace App\Http\Controllers;

use Auth;
use Exception;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use GuzzleHttp\Client;
use App\Helpers\Commons;
use App\Helpers\ValidationHelper;
use App\Helpers\SubscriptionHelper;
use App\Models\User;
use App\Models\SubscriptionPlan;
use App\Models\UserSubscription;
use App\Models\Voucher;
use App\Services\UserService;
use App\Services\SubscriptionService;

class SubscriptionController extends Controller
{
	private $errorType = 'subscription';
	private $rules = [
		'subscription' => [
			'chargify_token' => 'required|string',
			'membership_plan' => 'required|string',
		],
		'update_subscription' => [
			'membership_plan' => 'required|string',
		],
		'cancel_subscription' => [
			'cancellation_message' => 'nullable|string|max:4000',
			'reason_code' => 'nullable|string|max:20',
		],
	];

	public function __construct()
	{
		parent::__construct();
		$this->userService = new UserService();
		$this->subscriptionService = new SubscriptionService();
	}

	public function addSubscription(Request $request)
	{
		try {
			$user = Auth::user();
			$payload = Commons::prepareData($request->post());
			$this->validateSubscriptionPayload($payload);
			$subscriptionData = $this->prepareSubscription($payload);
			$rawChargifySubscription = SubscriptionHelper::createSubscription($subscriptionData);
			$activePlan = $this->subscriptionService->create($user, $rawChargifySubscription);
			return $this->success('Subscription Created!', Response::HTTP_CREATED, $activePlan);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function refreshSubscription()
	{
		try {
			$user = Auth::user();
			$remoteSubscriptions = $this->subscriptionService->getRemoteUserSubscriptions($user);
			$this->prepareBillingPortal($user);
			$currentActiveRemoteSubscription = $this->subscriptionService->extractCurrentActiveRemoteSubscription(
				$remoteSubscriptions
			);
			$this->subscriptionService->validateCurrentActiveRemoteSubscription(
				$currentActiveRemoteSubscription,
				$user
			);
			$this->subscriptionService->update($user, $currentActiveRemoteSubscription);

			$activePlan = $this->userService->getPlan($user);

			return $this->success(
				'Subscription Refreshed!',
				Response::HTTP_OK,
				$this->subscriptionService->refresh($activePlan)
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function updateSubscription($subscriptionPlanKey, Request $request)
	{
		try {
			$user = Auth::user();
			$this->validateSubscriptionPlanKey($subscriptionPlanKey);
			$activePlan = $user->getPaidActiveSubscription(true);
			$this->validateActivePlan($activePlan);
			$subscriptionId = $activePlan->subscription_id;
			$subscriptionData = $this->prepareUpdateSubscription(
				$user,
				$subscriptionId,
				$subscriptionPlanKey
			);
			$chargifySubscription = SubscriptionHelper::updateSubscription(
				$subscriptionId,
				$subscriptionData
			);
			$activePlan = $this->subscriptionService->update($user, $chargifySubscription);

			return $this->success('Subscription Updated!', Response::HTTP_OK, $activePlan);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function rawMigration(Request $request)
	{
		try {
			$user = Auth::user();
			$payload = Commons::prepareData($request->post());
			$subscriptionPlanKey = array_get($payload, 'product_handle');
			$activePlan = $user->getPaidActiveSubscription(true);
			$this->validateActivePlan($activePlan);
			$subscriptionId = $activePlan->subscription_id;
			$subscriptionData = $this->prepareRawSubscriptionMigration(
				$user,
				$subscriptionId,
				$subscriptionPlanKey
			);
			$chargifySubscription = SubscriptionHelper::migrateSubscription(
				$subscriptionId,
				$subscriptionData
			);
			return $this->success(
				'Subscription Migrated!',
				Response::HTTP_OK,
				$chargifySubscription
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function cancel(Request $request)
	{
		try {
			$user = Auth::user();
			$payload = Commons::prepareData($request->post());
			$activePlan = $user->getPaidActiveSubscription(true);
			$this->validateActivePlan($activePlan);
			$subscriptionId = $activePlan->subscription_id;
			$data = $this->prepareCancelSubscription($payload, $subscriptionId, $user);
			$this->validateCancelSubscriptionPayload($payload, $data);
			$chargifySubscription = SubscriptionHelper::cancelSubscription($data);
			$results = $this->subscriptionService->cancel($user, $chargifySubscription);

			return $this->success(
				'Successfully cancelled subscription!',
				Response::HTTP_OK,
				$results
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function delayedCancel(Request $request)
	{
		try {
			$user = Auth::user();
			$payload = Commons::prepareData($request->post());
			$activePlan = $user->getPaidActiveSubscription(true);
			$this->validateActivePlan($activePlan);
			$subscriptionId = $activePlan->subscription_id;
			$data = $this->prepareDelayedCancelSubscription($payload, $subscriptionId, $user);
			$this->validateCancelSubscriptionPayload($payload, $data);
			SubscriptionHelper::delayedCancelSubscription($data);
			$chargifySubscription = SubscriptionHelper::getSubscriptionById(
				array_get($data, 'subscription.subscription_id')
			);
			$results = $this->subscriptionService->delayedCancel($user, $chargifySubscription);
			return $this->success(
				'Successfully delay cancelled subscription!',
				Response::HTTP_OK,
				$results
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function stopDelayedCancel(Request $request)
	{
		try {
			$user = Auth::user();
			$payload = Commons::prepareData($request->post());
			$activePlan = $user->getPaidActiveSubscription(true);
			$this->validateActivePlan($activePlan);
			$subscriptionId = $activePlan->subscription_id;
			$data = $this->prepareStopDelayedCancelSubscription($payload, $subscriptionId, $user);
			SubscriptionHelper::stopDelayedCancelSubscription($data);
			$chargifySubscription = SubscriptionHelper::getSubscriptionById(
				array_get($data, 'subscription.subscription_id')
			);
			$activePlan = $this->subscriptionService->stopDelayedCancel(
				$user,
				$chargifySubscription
			);

			return $this->success(
				'Successfuly Stopped Delayed Cancellation!',
				Response::HTTP_OK,
				$activePlan
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getBillingPortal(Request $request)
	{
		try {
			$user = Auth::user();
			$billingPortal = $this->prepareBillingPortal($user);

			return [
				'portal_link' => $billingPortal,
			];
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getUserSubscription(Request $request)
	{
		try {
			$user = Auth::user();

			// Find local subscription first
			$activePlan = $user->getPaidActiveSubscription();

			// If none is found , ask remote data
			if (empty($activePlan)) {
				$customer = SubscriptionHelper::getCustomerByRef($user->ref);

				// If both local and remote data is missing, give user a default subscription type
				if (empty($customer)) {
					// Check if the user has initial subscription; If so, it means that user has needs to subscribe first;
					$initialPlan = $user->getInitialSubscription();

					// If the user has already subscribed, try to fetch/create the user's default view subscription
					if (empty($initialPlan)) {
						$viewPlan = $this->subscriptionService->makeViewSubscription($user);
					}

					return $viewPlan;
				}

				$remoteSubscriptions = $this->subscriptionService->getRemoteUserSubscriptions(
					$user
				);
				if (!empty($remoteSubscriptions)) {
					$activeRemoteSubscription = $this->subscriptionService->extractCurrentActiveRemoteSubscription(
						$remoteSubscriptions
					);
					$this->subscriptionService->validateCurrentActiveRemoteSubscription(
						$activeRemoteSubscription,
						$user
					);
					$activePlan = $this->subscriptionService->create(
						$user,
						$activeRemoteSubscription
					);
				}
			}

			$activePlan = $this->subscriptionService->refresh($activePlan);
			return $activePlan;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getSiteSubscriptions(Request $request)
	{
		try {
			$subscriptions = $this->subscriptionService->getSiteSubscriptions();
			return $subscriptions;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getVouchers(Request $request)
	{
		try {
			$vouchers = Voucher::select('*')->get();
			return $vouchers;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addVouchers(Request $request)
	{
		try {
			$user = Auth::user();
			$payload = Commons::prepareData($request->post());
			$this->subscriptionService->validateVouchersPayload($payload);
			$vouchers = Commons::getProperty($payload, 'vouchers');
			$plan = Commons::getProperty($payload, 'plan');
			$createdVouchers = $this->subscriptionService->addVouchers($vouchers, $plan);
			return $this->success('Vouchers Successfuly Created!', Response::HTTP_CREATED, [
				'vouchers' => $createdVouchers,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function resetVouchersUsageLimit(Request $request)
	{
		try {
			// Simply set the voucher_id to null for all the subscriptions that has a voucher_id.
			UserSubscription::whereNotNull('voucher_id')->update(['voucher_id' => null]);
			return $this->success(
				'Successfuly Reset Usage Limit for all vouchers!',
				Response::HTTP_OK
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getSiteTransactions(Request $request)
	{
		try {
			$allowedFilters = config('subscription.chargify.transaction_filters', []);
			$filters = array_filter(
				$request->all(),
				function ($key) use ($allowedFilters) {
					return in_array($key, $allowedFilters);
				},
				ARRAY_FILTER_USE_KEY
			);

			$transactions = SubscriptionHelper::getSiteTransactions($filters);

			return $transactions;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getSubscriptionPlans(Request $request)
	{
		try {
			// todo : remove hardcoded urls then re-enable api fetch api/1504
			// $subscriptionPlans = SubscriptionHelper::getSubscriptionPlans();
			// $subscriptionPlans = $this->sanitizeSubscriptionPlans($subscriptionPlans);

			// Get hardcoded list
			$hardPaymentPlans = config('subscription.local.payment_urls');

			// Then match the format specs
			$subscriptionPlans = [];
			foreach ($hardPaymentPlans as $hardPaymentPlan => $url) {
				$subscriptionPlans[] = [
					$hardPaymentPlan => [
						'url' => $url,
					],
				];
			}

			return $subscriptionPlans;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	protected function prepareSubscription($payload)
	{
		$user = Auth::user();
		$rawPlanKey = Commons::getProperty($payload, 'membership_plan');
		$subscriptionPlanKey = $this->subscriptionService->getSubscriptionPlan($rawPlanKey)->key;
		$chargifyToken = Commons::getProperty($payload, 'chargify_token');
		$customer = SubscriptionHelper::getCustomerByRef($user->ref);

		if (empty($customer)) {
			$customerData = $this->prepareCustomer($user);
			$customer = SubscriptionHelper::createCustomer($customerData);
		}

		$customerId = Commons::getProperty($customer['customer'], 'id');
		$subscriptions = SubscriptionHelper::getSubscriptions($customerId);
		$this->validateAlreadySubscribed($subscriptions, $user, $payload);
		$paymentProfiles = SubscriptionHelper::getPaymentProfiles($customerId);

		if (empty($paymentProfiles)) {
			$paymentProfileData = $this->preparePaymentProfile($customerId, $chargifyToken);
			$paymentProfile = SubscriptionHelper::createPaymentProfile($paymentProfileData);
		} else {
			$paymentProfile = reset($paymentProfiles);
		}

		$paymentProfileId = Commons::getProperty($paymentProfile['payment_profile'], 'id');
		$subscriptionData = [
			'subscription' => [
				'product_handle' => $subscriptionPlanKey,
				'customer_id' => $customerId,
				'payment_profile_id' => $paymentProfileId,
			],
		];

		return $subscriptionData;
	}

	protected function prepareUpdateSubscription($user, $subscriptionId, $rawPlanKey)
	{
		$subscriptionPlanKey = $this->subscriptionService->getSubscriptionPlan($rawPlanKey)->key;
		$this->validateSubscriptionUpdate($user, $subscriptionId, $subscriptionPlanKey);

		$subscriptionData = [
			'subscription' => [
				'product_handle' => $subscriptionPlanKey,
			],
		];

		return $subscriptionData;
	}

	protected function prepareRawSubscriptionMigration($user, $subscriptionId, $rawPlanKey)
	{
		$subscriptionPlanKey = $this->subscriptionService->getSubscriptionPlan($rawPlanKey)->key;
		$this->validateSubscriptionUpdate($user, $subscriptionId, $subscriptionPlanKey);

		$subscriptionData = [
			'migration' => [
				'product_handle' => $subscriptionPlanKey,
				'include_trial' => false,
				'include_initial_charge' => false,
				'include_coupons' => true,
				'preserve_period' => true,
			],
		];

		return $subscriptionData;
	}

	protected function prepareCustomer($user)
	{
		$user = $this->userService->refresh($user);

		// Both first and last name are mandatory and needs to be split
		$fullName = trim($user->name);
		$lastName =
			strpos($fullName, ' ') === false
				? ''
				: preg_replace('#.*\s([\w-]*)$#', '$1', $fullName);
		$lastName = empty(trim($lastName)) ? '-' : $lastName;
		$firstName = trim(preg_replace('#' . $lastName . '#', '', $fullName));

		// Contact
		$hasContact = $user->contact != null;
		$phone = $hasContact ? $user->contact->phone : '';

		// Address
		$hasAddress = $user->address != null;
		$info1 = $hasAddress ? $user->address->info1 : '';
		$info2 = $hasAddress ? $user->address->info2 : '';
		$city = $hasAddress ? $user->address->city : '';
		$postalCode = $hasAddress ? $user->address->postal_code : '';
		$countryCode = $hasAddress ? $user->address->country_code : '';

		$customerData = [
			'customer' => [
				'reference' => $user->ref,
				'first_name' => $firstName,
				'last_name' => $lastName,
				'email' => $user->email,
				'cc_emails' => '',
				'organization' => '',
				'address' => $info1,
				'address2' => $info2,
				'city' => $city,
				'state' => '',
				'zip' => $postalCode,
				'country' => $countryCode,
				'phone' => $phone,
			],
		];

		return $customerData;
	}

	protected function prepareBillingPortal($user)
	{
		$billing = $this->userService->getBilling($user);
		$fetchedFromRemote = false;

		if (empty($billing)) {
			$billing = $this->fetchBillingPortal($user);
			$fetchedFromRemote = true;
		}

		if (!$fetchedFromRemote) {
			$stillValid = Carbon::parse($billing->updated_at)->diffInDays(Carbon::now()) > 1;
			if (!$stillValid) {
				$billing = $this->fetchBillingPortal($user);
			}
		}

		return $billing->portal_link;
	}

	protected function fetchBillingPortal($user)
	{
		$customerId = $user->customer_id;

		if (empty($customerId)) {
			$customer = SubscriptionHelper::getCustomerByRef($user->ref);
			$this->validateExistingCustomer($user, $customer);
			$customerId = Commons::getProperty($customer['customer'], 'id');
		}

		$billingPortal = SubscriptionHelper::getBillingPortal($customerId);
		$billingPortalLink = Commons::getProperty($billingPortal, 'url');
		$billingPortalExpiry = Commons::getProperty($billingPortal, 'expires_at');
		$this->validateBillingPortalLink($user, $billingPortalLink);
		$billing = $this->userService->saveBilling($user, $billingPortalLink, $billingPortalExpiry);

		return $billing;
	}

	protected function preparePaymentProfile($customerId, $chargifyToken)
	{
		$paymentProfileData = [
			'payment_profile' => [
				'customer_id' => $customerId,
				'chargify_token' => $chargifyToken,
			],
		];

		return $paymentProfileData;
	}

	protected function prepareCancelSubscription($payload, $subscriptionId, $user)
	{
		$subscription = SubscriptionHelper::getSubscriptionById($subscriptionId);
		$this->validateActivePlan($subscription);
		$this->validateSubscriptionAction($user, $subscriptionId);

		// To indicate a specific error that it was already cancelled
		$this->validateAlreadyCancelledSubscription($subscription, $user);

		return [
			'subscription' => [
				'subscription_id' => $subscriptionId,
				'cancellation_message' => Commons::getProperty($payload, 'cancellation_message'),
				'reason_code' => Commons::getProperty($payload, 'reason_code'),
			],
		];
	}

	protected function prepareDelayedCancelSubscription($payload, $subscriptionId, $user)
	{
		$subscription = SubscriptionHelper::getSubscriptionById($subscriptionId);
		$this->validateActivePlan($subscription);
		$this->validateSubscriptionAction($user, $subscriptionId);

		// Because chargify allows delayed_cancel on top of a [cancelled] subscription
		$this->validateAlreadyCancelledSubscription($subscription, $user);
		// Because chargify allows delayed_cancel on top of an already [delay-cancelled] subscription
		$this->validateDelayedCancel($subscription, $user);

		return [
			'subscription' => [
				'subscription_id' => $subscriptionId,
				'cancellation_message' => Commons::getProperty($payload, 'cancellation_message'),
				'reason_code' => Commons::getProperty($payload, 'reason_code'),
			],
		];
	}

	protected function prepareStopDelayedCancelSubscription($payload, $subscriptionId, $user)
	{
		$subscription = SubscriptionHelper::getSubscriptionById($subscriptionId);
		$this->validateActivePlan($subscription);
		$this->validateSubscriptionAction($user, $subscriptionId);

		// Because chargify allows stop delayed_cancel , even if no delayed cancel flags are present
		$this->validateStopDelayedCancel($subscription, $user);

		return [
			'subscription' => [
				'subscription_id' => $subscriptionId,
			],
		];
	}

	protected function sanitizeUserSubscriptionResult($subscription)
	{
		return [
			'subscription' => [
				'id' => array_get($subscription, 'subscription.id'),
				'state' => array_get($subscription, 'subscription.state'),
				'created_at' => array_get($subscription, 'subscription.created_at'),
				'updated_at' => array_get($subscription, 'subscription.updated_at'),
				'next_assessment_at' => array_get($subscription, 'subscription.next_assessment_at'),
				'expires_at' => array_get($subscription, 'subscription.expires_at'),
				'product' => [
					'id' => array_get($subscription, 'subscription.product.id'),
					'handle' => array_get($subscription, 'subscription.product.handle'),
				],
			],
		];
	}

	protected function sanitizeCancelSubscriptionResult($subscription)
	{
		return [
			'subscription' => [
				'id' => array_get($subscription, 'subscription.id'),
				'cancellation_message' => array_get(
					$subscription,
					'subscription.cancellation_message'
				),
				'cancellation_method' => array_get(
					$subscription,
					'subscription.cancellation_method'
				),
				'reason_code' => array_get($subscription, 'subscription.reason_code'),
			],
		];
	}

	protected function sanitizeSiteSubscriptionResult($subscription)
	{
		return [
			'customer' => [
				'ref' => array_get($subscription, 'subscription.customer.reference'),
				'email' => array_get($subscription, 'subscription.customer.email'),
				'masked_card_number' => array_get(
					$subscription,
					'subscription.credit_card.masked_card_number'
				),
			],
			'subscription' => [
				'id' => array_get($subscription, 'subscription.id'),
				'state' => array_get($subscription, 'subscription.state'),
				'created_at' => array_get($subscription, 'subscription.created_at'),
				'updated_at' => array_get($subscription, 'subscription.updated_at'),
				'next_assessment_at' => array_get($subscription, 'subscription.next_assessment_at'),
				'expires_at' => array_get($subscription, 'subscription.expires_at'),
				'product' => [
					'id' => array_get($subscription, 'subscription.product.id'),
					'handle' => array_get($subscription, 'subscription.product.handle'),
				],
			],
		];
	}

	protected function sanitizeSubscriptionPlans($subscriptionPlans)
	{
		$sanitizedSubscriptionPlans = [];
		$subscriptionPlanKeys = SubscriptionPlan::orderBy('id')
			->pluck('key')
			->toArray();

		foreach ($subscriptionPlans as $subscriptionPlan) {
			$productHandle = Commons::convertHTMLToEntities(
				array_get($subscriptionPlan, 'product.handle')
			);
			$name = Commons::convertHTMLToEntities(array_get($subscriptionPlan, 'product.name'));
			$description = Commons::convertHTMLToEntities(
				array_get($subscriptionPlan, 'product.description')
			);
			$price = array_get($subscriptionPlan, 'product.price_in_cents') * 0.01;
			$publicSignupPages = array_get($subscriptionPlan, 'product.public_signup_pages');
			$url = Commons::convertHTMLToEntities(array_pluck($publicSignupPages, 'url')[0]);

			if (in_array($productHandle, $subscriptionPlanKeys)) {
				$sanitizedSubscriptionPlans[] = [
					$productHandle => [
						'name' => $name,
						'description' => $description,
						'price' => $price,
						'url' => $url,
					],
				];
			}
		}
		return $sanitizedSubscriptionPlans;
	}

	protected function validateSubscriptionUpdate($user, $subscriptionId, $subscriptionPlanKey)
	{
		$customer = SubscriptionHelper::getCustomerByRef($user->ref);
		$this->validateCustomer($customer, $user);
		// todo: refactor later to check the local copy of customer id before using chargify API
		$customerId = Commons::getProperty($customer['customer'], 'id');
		$subscriptions = SubscriptionHelper::getSubscriptions($customerId);
		$this->validateUserSubscriptions($subscriptions, $user);
		$subscriptionIds = array_pluck($subscriptions, 'subscription.id');
		$this->validateSubscriptionOwnership($subscriptionId, $subscriptionIds, $user);
		// Specific to updating of a subscription
		$subscriptionPlanKeys = array_pluck($subscriptions, 'subscription.product.handle');
		$this->validateSameSubscription($subscriptionPlanKey, $subscriptionPlanKeys, $user);
	}

	protected function validateSubscriptionAction($user, $subscriptionId)
	{
		$customer = SubscriptionHelper::getCustomerByRef($user->ref);
		$this->validateCustomer($customer, $user);
		// todo: refactor later to check the local copy of customer id before using chargify API
		$customerId = Commons::getProperty($customer['customer'], 'id');
		$subscriptions = SubscriptionHelper::getSubscriptions($customerId);
		$this->validateUserSubscriptions($subscriptions, $user);
		$subscriptionIds = array_pluck($subscriptions, 'subscription.id');
		$this->validateSubscriptionOwnership($subscriptionId, $subscriptionIds, $user);
	}

	protected function validateSubscriptionOwnership($subscriptionId, $subscriptionIds, $user)
	{
		if (!in_array($subscriptionId, $subscriptionIds)) {
			$this->fail(
				'User does not own this subscription.',
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

	protected function validateSameSubscription($subscriptionPlanKey, $subscriptionPlanKeys, $user)
	{
		if (in_array($subscriptionPlanKey, $subscriptionPlanKeys)) {
			$this->fail(
				'User is already subscribed to the same plan.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
					'subscription_key' => $subscriptionPlanKey,
				]
			);
		}
	}

	protected function validateExistingCustomer($user, $customer)
	{
		if (empty($customer)) {
			$this->fail(
				'User has no existing customer record.',
				$this->errorCodes['subscription_error_remote'],
				'',
				__FILE__,
				__LINE__,
				['user' => $user->ref]
			);
		}
	}

	protected function validateExistingPaymentProfiles($user, $paymentProfiles)
	{
		if (empty($paymentProfiles)) {
			$this->fail(
				'User has no existing payment profile.',
				$this->errorCodes['subscription_error_remote'],
				'',
				__FILE__,
				__LINE__,
				['user' => $user->ref]
			);
		}
	}

	protected function validateAlreadySubscribed($subscriptions, $user, $payload)
	{
		if (!empty($subscriptions)) {
			$subscriptions = array_column($subscriptions, 'subscription');

			foreach ($subscriptions as $subscription) {
				$status = Commons::getProperty($subscription, 'state');
				$subscriptionEoL = in_array(
					$status,
					config('subscription.chargify.states.end_of_life')
				);

				if (!$subscriptionEoL) {
					$this->fail(
						'User is already subscribed to a subscription.',
						$this->errorCodes['invalid_payload'],
						'',
						__FILE__,
						__LINE__,
						[
							'user' => $user->ref,
							'payload' => $payload,
						]
					);
				}
			}
		}
	}

	protected function validateBillingPortalLink($user, $billingPortalLink)
	{
		if (empty($billingPortalLink)) {
			$this->fail(
				'Error retrieving billing portal link.',
				$this->errorCodes['subscription_error_remote'],
				'',
				__FILE__,
				__LINE__,
				['user' => $user->ref]
			);
		}
	}

	protected function validateCustomer($customer, $user)
	{
		if (empty($customer)) {
			$this->fail(
				'User has no subscriptions',
				$this->errorCodes['subscription_error_remote'],
				'',
				__FILE__,
				__LINE__,
				['user' => $user->ref]
			);
		}
	}

	protected function validateUserSubscriptions($subscriptions, $user)
	{
		if (empty($subscriptions)) {
			$this->fail(
				'User has no subscriptions',
				$this->errorCodes['subscription_error_remote'],
				'',
				__FILE__,
				__LINE__,
				['user' => $user->ref]
			);
		}
	}

	protected function validateAlreadyCancelledSubscription($subscription, $user)
	{
		$status = array_get($subscription, 'subscription.state');
		if ($status == 'canceled') {
			$this->fail(
				'Subscription is already cancelled.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
					'subscription' => $subscription,
				]
			);
		}
	}

	protected function validateDelayedCancel($subscription, $user)
	{
		$remoteCancelFlag = array_get($subscription, 'subscription.cancel_at_end_of_period');
		$status = array_get($subscription, 'subscription.state');
		$subscriptionEoL = in_array($status, config('subscription.chargify.states.end_of_life'));

		if ($subscriptionEoL || $remoteCancelFlag == 'true') {
			$this->fail(
				'Subscription is not eligible for delayed cancel.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
					'subscription' => $subscription,
				]
			);
		}
	}

	protected function validateStopDelayedCancel($subscription, $user)
	{
		$remoteCancelFlag = array_get($subscription, 'subscription.cancel_at_end_of_period');
		$status = array_get($subscription, 'subscription.state');
		if ($status == 'canceled' || $remoteCancelFlag != 'true') {
			$this->fail(
				'Subscription is not eligible for stop delay cancel.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
					'subscription' => $subscription,
				]
			);
		}
	}

	protected function validateSubscriptionPayload($payload)
	{
		ValidationHelper::validatePayload($payload);
		ValidationHelper::validateDataWithRules(
			[
				'chargify_token' => Commons::getProperty($payload, 'chargify_token'),
				'membership_plan' => Commons::getProperty($payload, 'membership_plan'),
			],
			$this->rules['subscription']
		);
	}

	protected function validateSubscriptionPlanKey($subscriptionPlanKey)
	{
		ValidationHelper::validateDataWithRules(
			[
				'membership_plan' => $subscriptionPlanKey,
			],
			$this->rules['update_subscription']
		);
	}

	protected function validateCancelSubscriptionPayload($payload, $data)
	{
		ValidationHelper::validatePayload($payload);
		ValidationHelper::validateDataWithRules(
			$data['subscription'],
			$this->rules['cancel_subscription']
		);
	}

	protected function validateActivePlan($subscription)
	{
		if (empty($subscription)) {
			$this->fail(
				'User is on free or has no active paid subscription.',
				$this->errorCodes['subscription_error_remote'],
				'',
				__FILE__,
				__LINE__,
				['subscription' => $subscription]
			);
		}
	}
}
