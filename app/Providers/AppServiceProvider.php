<?php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Validator;
use App\Helpers\ValidationHelper;
use Illuminate\Support\Facades\DB;
use App\Helpers\LogHelper;

class AppServiceProvider extends ServiceProvider
{
	/**
	 * Bootstrap any application services.
	 *
	 * @return void
	 */
	public function boot()
	{
		$this->initTimeZone();
		$this->initErrorReporting();
		$this->DBListen();
		$this->registerCustomValidationRules();
	}

	/**
	 * Register any application services.
	 *
	 * @return void
	 */
	public function register()
	{
	}

	private function initErrorReporting()
	{
		error_reporting(0);

		if (!PROD) {
			error_reporting(E_ALL);
		}
	}

	private function initTimeZone()
	{
		date_default_timezone_set(config('app.timezone', 'UTC'));
	}

	private function DBListen()
	{
		DB::listen(function ($query) {
			$request = request();
			$requestURI = $request->server('REQUEST_URI');

			$data = [
				'endpoint' => parse_url($requestURI, PHP_URL_PATH),
				'time' => $query->time,
				'SQL' => $query->sql,
			];

			if (DEV) {
				$data['data'] = $query->bindings;
			}

			/*
				$stderr = fopen('php://stderr', 'w');
				//fwrite($stderr, JSON_encode($data)."\n");
				fwrite($stderr, $query->time . "\t" . $query->sql."\n");
			//*/

			if (
				0 ||
				(!empty(config('app.log.sqlLogsDir')) &&
					config('app.log.sqlExecution') < $query->time)
			) {
				LogHelper::RawLog($data, config('app.log.sqlLogsDir'));
			}
		});
	}

	private function registerCustomValidationRules()
	{
		Validator::extend('valid_text', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_text'), $value);
		});

		Validator::extend('valid_user_name', function (
			$attribute,
			$value,
			$parameters,
			$validator
		) {
			// d'Autore is a valid surname, but not abc'''test
			if (strpos($value, "''") !== false) {
				return false;
			}

			return ValidationHelper::isPatternValid(config('regex.valid_user_name'), $value);
		});

		Validator::extend('valid_email', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_email'), $value);
		});

		Validator::extend('valid_subject_name', function (
			$attribute,
			$value,
			$parameters,
			$validator
		) {
			return ValidationHelper::isPatternValid(config('regex.valid_subject_name'), $value);
		});

		Validator::extend('valid_region', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_region'), $value);
		});

		Validator::extend('valid_ref', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_ref'), $value);
		});

		Validator::extend('valid_voucher_code', function (
			$attribute,
			$value,
			$parameters,
			$validator
		) {
			return ValidationHelper::isPatternValid(config('regex.valid_voucher_code'), $value);
		});

		Validator::extend('valid_handle', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_handle'), $value);
		});

		Validator::extend('valid_client', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_client'), $value);
		});

		Validator::extend('valid_version', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_version'), $value);
		});

		Validator::extend('valid_rating', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_rating'), $value);
		});

		Validator::extend('valid_parker_val', function (
			$attribute,
			$value,
			$parameters,
			$validator
		) {
			return ValidationHelper::isPatternValid(config('regex.valid_parker_val'), $value);
		});

		Validator::extend('valid_price', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_price'), $value);
		});

		Validator::extend('non_print', function ($attribute, $value, $parameters, $validator) {
			// If non-printable char is detected, return false
			return !ValidationHelper::hasNonPrintableChars($value);
		});

		Validator::extend('non_print_or_tags', function (
			$attribute,
			$value,
			$parameters,
			$validator
		) {
			// If non-printable char or html is detected, return false
			return !ValidationHelper::hasNonPrintableCharsOrTags($value);
		});

		Validator::extend('valid_long_text', function (
			$attribute,
			$value,
			$parameters,
			$validator
		) {
			return ValidationHelper::isValidLongText($value);
		});

		Validator::extend('sha256', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.sha256'), $value);
		});

		Validator::extend('not_string', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isNotString($value);
		});

		Validator::extend('valid_latitude', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_latitude'), $value);
		});

		Validator::extend('valid_longitude', function (
			$attribute,
			$value,
			$parameters,
			$validator
		) {
			return ValidationHelper::isPatternValid(config('regex.valid_longitude'), $value);
		});

		Validator::extend('valid_object', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isValidObject($value);
		});

		Validator::extend('valid_phone_prefix', function (
			$attribute,
			$value,
			$parameters,
			$validator
		) {
			return ValidationHelper::isPatternValid(config('regex.valid_phone_prefix'), $value);
		});

		Validator::extend('valid_phone', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_phone'), $value);
		});

		Validator::extend('valid_client_host', function (
			$attribute,
			$value,
			$parameters,
			$validator
		) {
			return ValidationHelper::isPatternValid(config('regex.valid_client_host'), $value);
		});

		Validator::extend('base64', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.base64'), $value);
		});

		Validator::extend('valid_hjson', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::validateHjson($attribute, $value);
		});

		Validator::extend('valid_fkey', function ($attribute, $value, $parameters, $validator) {
			return ValidationHelper::isPatternValid(config('regex.valid_fkey'), $value);
		});
	}
}
