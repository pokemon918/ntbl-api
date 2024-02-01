<?php
namespace App\Helpers;

use GuzzleHttp\Client;
use App\Helpers\ValidationHelper;
use App\Helpers\Commons;
use Psr\Http\Message\ResponseInterface;
use GuzzleHttp\Exception\RequestException;

class SubscriptionHelper
{
	private static $chargifyDomain = '';
	private static $chargifyAuth = [];
	private static $productFamilyID = null;
	private static $guzzleClient = null;
	private static $errorCodes = [];
	private static $httpErrors = true;

	public static function init()
	{
		self::validateChargifyConfig();

		if (empty(self::$chargifyDomain)) {
			self::$chargifyDomain = config('subscription.chargify.api_domain');
		}

		if (empty(self::$chargifyAuth)) {
			self::$chargifyAuth = [config('subscription.chargify.api_key'), 'x'];
		}

		if (empty(self::$productFamilyID)) {
			self::$productFamilyID = config('subscription.chargify.product_family_id');
		}

		if (empty(self::$errorCodes)) {
			self::$errorCodes = config('app.errorCodes');
		}

		if (empty(self::$guzzleClient)) {
			self::$guzzleClient = new Client();
		}

		if (PROD) {
			self::$httpErrors = false;
		}
	}

	public static function createCustomer($customer)
	{
		$response = self::request(
			'POST',
			config('subscription.chargify.endpoints.create_customer'),
			$customer,
			null
		);
		self::validateResponse($response, 'Error adding customer');
		return self::prepareResponse($response);
	}

	public static function getCustomerByRef($ref)
	{
		$query = ['reference' => $ref];
		$response = self::request(
			'GET',
			config('subscription.chargify.endpoints.get_customer_by_ref'),
			null,
			$query
		);
		return self::prepareResponse($response);
	}

	public static function getBillingPortal($customerId)
	{
		$query = ['auto_invite' => 1];
		$endpoint = self::$chargifyDomain . "/portal/customers/$customerId/management_link.json";
		$response = self::request('GET', $endpoint, null, null);
		self::validateResponse($response, 'Error retrieving billing portal link.');
		return self::prepareResponse($response);
	}

	public static function enableBillingPortalWithInvite($customerId)
	{
		$endpoint = self::$chargifyDomain . "/portal/customers/$customerId/enable.json";
		$response = self::request('POST', $endpoint, null, null);
		return self::prepareResponse($response);
	}

	public static function createPaymentProfile($paymentProfile)
	{
		$response = self::request(
			'POST',
			config('subscription.chargify.endpoints.add_payment_profile'),
			$paymentProfile,
			null
		);
		self::validateResponse($response, 'Error adding payment profile');
		return self::prepareResponse($response);
	}

	public static function getPaymentProfiles($customerId)
	{
		$query = ['customer_id' => $customerId];
		$response = self::request(
			'GET',
			config('subscription.chargify.endpoints.get_payment_profiles'),
			null,
			$query
		);
		return self::prepareResponse($response);
	}

	public static function getPaymentProfileById($paymentProfileId)
	{
		$endpoint = self::$chargifyDomain . "/payment_profiles/$paymentProfileId.json";
		$response = self::request('GET', $endpoint, null, null);
		return self::prepareResponse($response);
	}

	public static function createSubscription($subscription)
	{
		$response = self::request(
			'POST',
			config('subscription.chargify.endpoints.create_subscription'),
			$subscription,
			null
		);
		self::validateResponse($response, 'Error adding subscription.');
		return self::prepareResponse($response);
	}

	public static function updateSubscription($subscriptionId, $newSubscription)
	{
		$endpoint = self::$chargifyDomain . "/subscriptions/{$subscriptionId}.json";
		$response = self::request('PUT', $endpoint, $newSubscription, null);
		self::validateResponse($response, 'Error updating subscription.');
		return self::prepareResponse($response);
	}

	public static function migrateSubscription($subscriptionId, $newSubscription)
	{
		$endpoint = self::$chargifyDomain . "/subscriptions/{$subscriptionId}/migrations.json";
		$response = self::request('POST', $endpoint, $newSubscription, null);
		self::validateResponse($response, 'Error migrating subscription.');
		return self::prepareResponse($response);
	}

	public static function cancelSubscription($data)
	{
		$subscriptionID = array_get($data, 'subscription.subscription_id');
		$endpoint = self::$chargifyDomain . "/subscriptions/{$subscriptionID}.json";
		$response = self::request('DELETE', $endpoint, $data);
		self::validateResponse($response, 'Error cancelling subscription.');
		return self::prepareResponse($response);
	}

	public static function delayedCancelSubscription($data)
	{
		$subscriptionID = array_get($data, 'subscription.subscription_id');
		$endpoint = self::$chargifyDomain . "/subscriptions/{$subscriptionID}/delayed_cancel.json";
		$response = self::request('POST', $endpoint, $data);
		self::validateResponse($response, 'Error delayed cancelling subscription.');
		return self::prepareResponse($response);
	}

	public static function stopDelayedCancelSubscription($data)
	{
		$subscriptionID = array_get($data, 'subscription.subscription_id');
		$endpoint = self::$chargifyDomain . "/subscriptions/{$subscriptionID}/delayed_cancel.json";
		$response = self::request('DELETE', $endpoint, $data);
		self::validateResponse($response, 'Error delayed cancelling subscription.');
		return self::prepareResponse($response);
	}

	public static function getSubscriptionById($subscriptionId)
	{
		$endpoint = self::$chargifyDomain . "/subscriptions/{$subscriptionId}.json";
		$response = self::request('GET', $endpoint, null, null);
		return self::prepareResponse($response);
	}

	public static function getSubscriptions($customerId)
	{
		$endpoint = self::$chargifyDomain . "/customers/{$customerId}/subscriptions.json";
		$response = self::request('GET', $endpoint, null, null);
		return self::prepareResponse($response);
	}

	public static function getSiteSubscriptions($filters)
	{
		$response = self::request(
			'GET',
			config('subscription.chargify.endpoints.get_site_subscriptions'),
			null,
			$filters
		);
		return self::prepareResponse($response);
	}

	public static function getSiteTransactions($filters)
	{
		$response = self::request(
			'GET',
			config('subscription.chargify.endpoints.get_site_transactions'),
			null,
			$filters
		);
		return self::prepareResponse($response);
	}

	public static function getSubscriptionPlans()
	{
		$endpoint =
			self::$chargifyDomain .
			'/product_families/' .
			self::$productFamilyID .
			' /products.json';
		$response = self::request('GET', $endpoint, null, null);
		return self::prepareResponse($response);
	}

	public static function validateVoucher($voucher)
	{
		self::validateProductFamilyID();
		$endpoint =
			self::$chargifyDomain .
			"/coupons/validate.json?code={$voucher}&product_family_id=" .
			self::$productFamilyID;
		$response = self::request('GET', $endpoint, null, null);
		return self::prepareResponse($response);
	}

	public static function findCoupon($voucher)
	{
		self::validateProductFamilyID();
		$endpoint =
			self::$chargifyDomain .
			"/coupons/find.json?code={$voucher}&product_family_id=" .
			self::$productFamilyID;
		$response = self::request('GET', $endpoint, null, null);
		$response = self::prepareResponse($response);

		if (isset($response['coupon'])) {
			return $response['coupon'];
		}

		return $response;
	}

	public static function request($method, $endpoint, $data, $query = null)
	{
		$promise = self::$guzzleClient->requestAsync($method, $endpoint, [
			'auth' => self::$chargifyAuth,
			'json' => $data,
			'query' => $query,
		]);

		$response = $promise
			->then(
				function (ResponseInterface $res) {
					return $res;
				},
				function (RequestException $e) {
					$res = $e->getResponse();
					if (empty($res)) {
						self::throwContextError($e->getHandlerContext());
					}
					if ($res->getStatusCode() == 401) {
						self::throwAccessError($res);
					}

					$summary = $e->getResponseBodySummary($res);
					if (!empty($summary)) {
						self::throwSummaryError($summary);
					}

					return $res;
				}
			)
			->wait();

		return $response;
	}

	public static function throwSummaryError($summary)
	{
		$errors = json_decode($summary)->errors;

		if (is_array($errors)) {
			if (!isset($errors[0]) && empty($errors[0])) {
				return false;
			}

			$msg = json_decode($summary)->errors[0];
		}

		if (is_string($errors)) {
			$msg = json_decode($summary)->errors;
		}

		ValidationHelper::fail(
			$msg,
			self::$errorCodes['subscription_error_remote'],
			null,
			__FILE__,
			__LINE__,
			[
				'summary' => $summary,
			]
		);
	}

	public static function throwContextError($context)
	{
		$msg = $context['error'];

		ValidationHelper::fail(
			$msg,
			self::$errorCodes['subscription_error_remote'],
			null,
			__FILE__,
			__LINE__,
			[
				'context' => $context,
			]
		);
	}

	public static function throwAccessError($res)
	{
		ValidationHelper::fail(
			'Unauthorized: Please make sure that you have a valid chargify api key or you have the correct priviledges.',
			self::$errorCodes['subscription_error_remote'],
			'chargifyCustomer',
			__FILE__,
			__LINE__,
			[
				'status' => $res->getStatusCode(),
				'data' => $res->getBody(),
				'chargify_domain' => self::$chargifyDomain,
				'chargify_api_key' => self::$chargifyAuth,
			]
		);
	}

	public static function prepareResponse($response)
	{
		return json_decode($response->getBody(), true);
	}

	public static function validateResponse($response, $msg)
	{
		if ($response->getStatusCode() >= 400) {
			ValidationHelper::fail(
				$msg,
				self::$errorCodes['subscription_error_remote'],
				'chargifyCustomer',
				__FILE__,
				__LINE__,
				[
					'status' => $response->getStatusCode(),
					'data' => $response->getBody(),
				]
			);
		}
	}

	public static function validateChargifyConfig()
	{
		if (empty(self::$chargifyDomain)) {
			if (empty(config('subscription.chargify.api_domain'))) {
				ValidationHelper::fail(
					'Chargify API config is empty or invalid',
					self::$errorCodes['subscription_error_remote'],
					'api_domain',
					__FILE__,
					__LINE__
				);
			}
		}

		if (empty(self::$chargifyAuth)) {
			if (empty(config('subscription.chargify.api_key'))) {
				ValidationHelper::fail(
					'Chargify API config is empty or invalid',
					self::$errorCodes['subscription_error_remote'],
					'api_key',
					__FILE__,
					__LINE__
				);
			}
		}
	}

	public static function validateProductFamilyID()
	{
		if (empty(self::$productFamilyID)) {
			if (empty(config('subscription.chargify.product_family_id'))) {
				ValidationHelper::fail(
					'Chargify API config is empty or invalid',
					self::$errorCodes['subscription_error_remote'],
					'product_family_id',
					__FILE__,
					__LINE__
				);
			}
		}
	}
}

SubscriptionHelper::init();
