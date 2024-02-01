<?php
namespace App\Http\Controllers;

use Auth;
use Exception;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Monolog\Logger;
use App\Helpers\LogHelper;
use App\Helpers\Commons;
use App\Helpers\ValidationHelper;
use App\Helpers\SubscriptionHelper;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\SubscriptionPlan;
use App\Models\ChargifyEvent;
use App\Services\SubscriptionService;

class WebhookController extends Controller
{
	private $errorType = 'webhook';

	public function __construct()
	{
		parent::__construct();
		$this->subscriptionService = new SubscriptionService();
		$this->errorCodes = config('app.errorCodes');
		$this->shared_key = config('subscription.chargify.shared_key');
		$this->defaultSubscriptionPlan = config('subscription.local.default_plan');
		$this->initialSubscriptionPlan = config('subscription.local.initial_plan');
	}

	public function catchEvent(Request $request)
	{
		try {
			DB::beginTransaction();

			if (!DEV) {
				$this->validateSignature($request);
				$this->validateRequest($request);
			}

			$payload = Commons::prepareData($request->post());
			LogHelper::RawLog(
				$payload,
				config('subscription.chargify.webhook_data_log'),
				Logger::INFO
			);
			$this->validateEventPayload($payload);
			$this->saveEvent($payload);
			$this->handleEventLogic($payload);
			DB::commit();
			return $this->success('Accepted', Response::HTTP_OK, null);
		} catch (Exception $e) {
			DB::rollBack();
			return $this->error($e, $this->errorType);
		}
	}

	private function handleEventLogic($payload)
	{
		$eventType = Commons::getProperty($payload, 'event', 'chargify_event');
		$eventBody = Commons::getProperty($payload, 'payload');
		$subscription = $eventBody['subscription'];

		switch ($eventType) {
			case 'signup_success':
				$this->handleSignupSuccess($subscription);
				break;
			case 'signup_failure':
			case 'subscription_state_change':
				$this->handleSubscriptionStateChange($subscription);
				break;
			case 'subscription_product_change':
				$this->handleSubscriptionProductChange($subscription);
				break;
			case 'payment_success':
			case 'payment_failure':
				# set the local subscription to the event type
				$this->validateSubscriptionId($subscription['id']);
				$this->subscriptionService->updateStatus($subscription['id'], $eventType);
				break;
			default:
				# do nothing by default
				break;
		}
	}

	private function handleSignupSuccess($remoteSubscription)
	{
		$subscriptionId = array_get($remoteSubscription, 'id');
		$this->validateSubscriptionId($subscriptionId);
		$userRef = Commons::convertHTMLToEntities(
			array_get($remoteSubscription, 'customer.reference')
		);
		$user = User::where('ref', '=', $userRef)->first();
		$this->validateUser($user);
		$productHandle = array_get($remoteSubscription, 'product.handle');
		$plan = $this->subscriptionService->getSubscriptionPlan($productHandle);

		$activePlan = UserSubscription::where('subscription_id', '=', $subscriptionId)->first();
		if (!empty($activePlan)) {
			return;
		}

		$this->subscriptionService->createSubscription($user, $remoteSubscription);
	}

	private function handleSubscriptionStateChange($subscription)
	{
		// Remote Fields
		$id = Commons::getProperty($subscription, 'id');
		$this->validateSubscriptionId($id);
		$status = Commons::getProperty($subscription, 'state');
		$createdAt = array_get($subscription, 'created_at');
		$nextAssessmentAt = array_get($subscription, 'next_assessment_at');
		$productHandle = array_get($subscription, 'product.handle');
		$plan = $this->subscriptionService->getSubscriptionPlan($productHandle);
		$userRef = array_get($subscription, 'customer.reference');
		$problemStates = config('subscription.chargify.states.problem');
		$endOfLifeStates = config('subscription.chargify.states.end_of_life');

		$user = User::where('ref', '=', $userRef)->first();
		$this->validateUser($user);

		// Get Local Subscription
		$localSubscription = UserSubscription::where('subscription_id', '=', $id)->first();

		if (empty($localSubscription)) {
			$this->subscriptionService->createSubscription($user, $subscription);
			return;
		}

		// Update the local subscription with actual state instead of nullifying the fields
		$localSubscription->status = $status;
		$localSubscription->save();
	}

	private function handleSubscriptionProductChange($subscription)
	{
		// Remote Fields
		$id = Commons::getProperty($subscription, 'id');
		$this->validateSubscriptionId($id);
		$status = Commons::getProperty($subscription, 'state');
		$createdAt = array_get($subscription, 'created_at');
		$nextAssessmentAt = array_get($subscription, 'next_assessment_at');
		$productHandle = array_get($subscription, 'product.handle');
		$userRef = array_get($subscription, 'customer.reference');
		$problemStates = config('subscription.chargify.states.problem');
		$endOfLifeStates = config('subscription.chargify.states.end_of_life');

		$activePlan = UserSubscription::where('subscription_id', '=', $id)->first();
		// If remote exists and local does not
		if (empty($activePlan)) {
			$activePlan = new UserSubscription();
			$activePlan->subscription_id = $id;

			$activePlan->start_date = Carbon::parse($createdAt)->format('Y-m-d H:i:s');
			$activePlan->end_date = Carbon::parse($nextAssessmentAt)->format('Y-m-d H:i:s');
		}

		$user = User::where('ref', '=', $userRef)->first();
		$this->validateUser($user);
		$activePlan->user_id = $user->id;
		$plan = $this->subscriptionService->getSubscriptionPlan($productHandle);
		$activePlan->plan_id = $plan->id;
		$activePlan->save();
	}

	private function validateChargifySharedKey()
	{
		if (empty($this->shared_key)) {
			ValidationHelper::fail(
				'Chargify API config is empty or invalid',
				$this->errorCodes['subscription_error_remote'],
				'api_domain',
				__FILE__,
				__LINE__
			);
		}
	}

	protected function saveEvent($payload)
	{
		$webHookId = Commons::getProperty($payload, 'id');
		$eventType = Commons::getProperty($payload, 'event', 'chargify_event');
		$eventBody = json_encode(Commons::getProperty($payload, 'payload'));
		$event = ChargifyEvent::where('webhook_id', '=', $webHookId)->first();

		if (!DEV) {
			$this->validateDuplicateEvent($payload, $event);
		}

		if (empty($event)) {
			$event = new ChargifyEvent();
		}

		$event->webhook_id = $webHookId;
		$event->event_type = $eventType;
		$event->event_body = $eventBody;
		$event->save();
	}

	protected function validateDuplicateEvent($payload, $event)
	{
		$eventType = Commons::getProperty($payload, 'event');
		if (!empty($event) && $eventType != 'ntbl_unit_test') {
			$this->fail(
				'Already accepted',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'payload' => $payload,
				]
			);
		}
	}

	protected function validateRequest($request)
	{
		if (!in_array($request->ip(), config('subscription.chargify.outbound_ips'))) {
			$this->fail(
				'Unauthorized access',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'payload' => Commons::prepareData($request->post()),
				]
			);
		}
	}

	protected function validateEventPayload($payload)
	{
		$payload = [
			'webhook_id' => Commons::getProperty($payload, 'id'),
			'event_type' => Commons::getProperty($payload, 'event'),
			'event_body' => json_encode(Commons::getProperty($payload, 'payload')),
		];

		$chargifyEventValidator = Validator::make(
			$payload,
			ChargifyEvent::$rules,
			$this->ruleMessages
		);
		$this->checkValidatorForErrors($chargifyEventValidator);
	}

	private function validateSignature($request)
	{
		$signature = $request->header('X-Chargify-Webhook-Signature-Hmac-Sha-256');
		$rawHttpBody = $request->getContent();
		$this->validateChargifySharedKey();
		$this->validateSignatureAndBody($signature, $rawHttpBody);

		if (hash_hmac('sha256', $rawHttpBody, $this->shared_key) == $signature) {
			return true;
		}

		ValidationHelper::fail(
			'Invalid signature',
			$this->errorCodes['subscription_error_remote'],
			'signature',
			__FILE__,
			__LINE__
		);
	}

	private function validateSignatureAndBody($signature, $rawHttpBody)
	{
		if (empty($signature) || empty($rawHttpBody)) {
			ValidationHelper::fail(
				'Invalid request',
				$this->errorCodes['subscription_error_remote'],
				'api_domain',
				__FILE__,
				__LINE__
			);
		}
	}

	private function validateSubscriptionId($subscriptionId)
	{
		if (empty($subscriptionId)) {
			ValidationHelper::fail(
				'Subscription Id not found.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				null
			);
		}
	}

	private function validateSubscriptionPlan($plan)
	{
		if (empty($plan)) {
			ValidationHelper::fail(
				'Subscription type note found.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				null
			);
		}
	}

	private function validateUser($user)
	{
		if (empty($user)) {
			ValidationHelper::fail(
				'User not found.',
				$this->errorCodes['user_does_not_exist'],
				'',
				__FILE__,
				__LINE__,
				null
			);
		}
	}
}
