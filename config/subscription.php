<?php

function envDomainCheck($envKey)
{
	$errMsg = $envKey . ' must be a link using the domain ' . env('CHARGIFY_API_DOMAIN');
	$val = envDemand($envKey);

	if (!is_string($val)) {
		return $envKey . ' not found in .env';
	}

	$subdomain = substr($val, 0, strpos($val, '.'));

	if (0 !== strpos(env('CHARGIFY_API_DOMAIN'), $subdomain)) {
		# throw new Exception($msg);
		return $errMsg;
	}

	return $val;
}

return [
	'chargify' => [
		'api_domain' => envDemand('CHARGIFY_API_DOMAIN'),
		'api_key' => envDemand('CHARGIFY_API_KEY'),
		'shared_key' => envDemand('CHARGIFY_SHARED_KEY'),
		'product_family_id' => envDemand('CHARGIFY_PRODUCT_FAMILY_ID'),
		'subscription_filters' => [
			'page',
			'per_page',
			'state',
			'product',
			'product_revision_number',
			'coupon',
			'date_field',
			'start_date',
			'end_date',
			'start_datetime',
			'end_datetime',
		],
		'transaction_filters' => [
			'page',
			'per_page',
			'kinds',
			'max_id',
			'since_id',
			'since_date',
			'until_date',
			'direction',
			'order_by',
		],
		'outbound_ips' => [
			'127.0.0.1',
			'50.112.130.129',
			'50.112.144.200',
			'50.112.147.117',
			'107.23.118.166',
			'107.23.119.26',
			'107.23.118.227',
			'54.229.13.248',
			'54.229.57.150',
			'54.229.48.92',
		],
		'states' => [
			'live' => ['active', 'assessing', 'paused', 'pending', 'trialing'],
			'problem' => ['past_due', 'soft_failure', 'unpaid'],
			'end_of_life' => [
				'canceled',
				'expired',
				'failed_to_create',
				'on_hold',
				'suspended',
				'trial_ended',
			],
		],
		'endpoints' => [
			'create_customer' => envDemand('CHARGIFY_API_DOMAIN') . '/customers.json',
			'get_customer_by_ref' => env('CHARGIFY_API_DOMAIN') . '/customers/lookup.json',
			'get_billing_portal' => env('CHARGIFY_API_DOMAIN') . '/lookup.json',
			'add_payment_profile' => env('CHARGIFY_API_DOMAIN') . '/payment_profiles.json',
			'get_payment_profiles' => env('CHARGIFY_API_DOMAIN') . '/payment_profiles.json',
			'get_payment_profiles' => env('CHARGIFY_API_DOMAIN') . '/payment_profiles.json',
			'create_subscription' => env('CHARGIFY_API_DOMAIN') . '/subscriptions.json',
			'get_site_subscriptions' => env('CHARGIFY_API_DOMAIN') . '/subscriptions.json',
			'get_site_transactions' => env('CHARGIFY_API_DOMAIN') . '/subscriptions.json',
		],
		'product_handles' => ['view', 'subscribe', 'basic', 'pro', 'scholar'],
		'webhook_data_log' => '../http_webhook_log_/webhook_',
		'voucher' => [
			'default_usage_limit' => env('VOUCHER_DEFAULT_USAGE_LIMIT_REMOTE', 1),
			'valid_days' => env('VOUCHER_VALID_DAYS', 30),
		],
	],
	'local' => [
		'states' => [
			'live' => ['new', 'active', 'trialing', 'delayed_cancel'],
			'pending' => ['payment_approval'],
			'end_of_life' => ['canceled'],
		],
		'payment_urls' => [
			'basic1m' => envDomainCheck('PAY_URL_BASIC1M'),
			'basic6m' => envDomainCheck('PAY_URL_BASIC6M'),
			'basic12m' => envDomainCheck('PAY_URL_BASIC12M'),
			'pro1m' => envDomainCheck('PAY_URL_PRO1M'),
			'pro6m' => envDomainCheck('PAY_URL_PRO6M'),
			'pro12m' => envDomainCheck('PAY_URL_PRO12M'),
			'scholar1m' => envDomainCheck('PAY_URL_SCHOLAR1M'),
			'scholar6m' => envDomainCheck('PAY_URL_SCHOLAR6M'),
			'scholar12m' => envDomainCheck('PAY_URL_SCHOLAR12M'),
		],
		'dev_vouchers' => [
			'BASIC123' => 'basic',
			'PRO123' => 'pro',
			'SCHOLAR123' => 'scholar',
			'VIEW123' => 'view',
		],
		'initial_plan' => 'subscribe',
		'default_plan' => 'view',
		'basic_to_pro_validity' => env('BASIC_TO_PRO_VALIDITY', 30),
		'voucher' => [
			'default_usage_limit' => env('VOUCHER_DEFAULT_USAGE_LIMIT_LOCAL', 10),
			'valid_days' => env('VOUCHER_VALID_DAYS', 30),
		],
	],
	'paid_plans' => ['basic', 'pro', 'scholar'],
	'signup_force_scholar' => env('SIGNUP_FORCE_SCHOLAR', false),
	'basic_to_pro' => env('BASIC_TO_PRO', false),
];
