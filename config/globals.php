<?php
// Environment
defined('TEST') or define('TEST', env('APP_ENV') == 'test');
defined('PROD') or define('PROD', env('APP_ENV') == 'prod');
defined('DEV') or define('DEV', !PROD && !TEST);
defined('DB_PREFIX') or define('DB_PREFIX', env('DB_PREFIX') ?: '');
defined('DEBUG') or
	define(
		'DEBUG',
		(isset($_GET['debug']) || env('APP_DEBUG')) && ((PROD && IS_WHITELISTED) || !PROD)
	);

// function exists in PHP 7.3
if (!function_exists('is_countable')) {
	function is_countable($x)
	{
		return is_array($x) || $x instanceof Countable;
	}
}

if (!function_exists('pd')) {
	function pd($item = null)
	{
		print_r($item);
		die();
	}
}

if (!function_exists('request')) {
	/**
	 * Get an instance of the current request or an input item from the request.
	 *
	 * @param  array|string  $key
	 * @param  mixed   $default
	 * @return \Illuminate\Http\Request|string|array
	 */
	function request($key = null, $default = null)
	{
		if (is_null($key)) {
			return app('request');
		}
		if (is_array($key)) {
			return app('request')->only($key);
		}
		$value = app('request')->__get($key);
		return is_null($value) ? value($default) : $value;
	}
}

if (!function_exists('envDemand')) {
	function envDemand($envKey)
	{
		// return env($envKey); // Untill tests are OK

		$key = 'unique' . time();
		$val = env($envKey, $key);

		if ($key == $val || empty($val)) {
			$msg = $envKey . ' must be set in .env';
			throw new Exception($msg);
			// return $msg;
		}

		return $val;
	}
}
