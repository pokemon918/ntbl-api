<?php
namespace App\Helpers;

use Exception;
use HJSON\HJSONParser;
use App\Helpers\ValidationHelper;

class Commons
{
	private static $errorCodes = [];

	public static function init()
	{
		if (empty(self::$errorCodes)) {
			self::$errorCodes = config('app.errorCodes');
		}
	}

	public static function getProperty($payload, $field, $default = '')
	{
		if (empty($payload[$field])) {
			return $default;
		}

		if (!is_string($payload[$field])) {
			return $payload[$field];
		}

		return trim($payload[$field]);
	}

	public static function prepareData($data)
	{
		if (!is_array($data) && !is_string($data)) {
			return $data;
		}

		if (is_string($data)) {
			return trim($data);
		}

		foreach ($data as $key => $val) {
			if (is_array($val)) {
				$data[$key] = self::prepareData($data[$key]);
			}

			if (is_string($val)) {
				$data[$key] = trim($data[$key]);
			}
		}

		return $data;
	}

	public static function parseRating($val)
	{
		$numBreakDown = explode('.', $val);

		// Check rating value has decimal
		if (isset($numBreakDown[1])) {
			$decimal = $numBreakDown[1];

			// if decimal is more than 9 places, shorten it to 9 places first then parse to float
			if (strlen($decimal) > 9) {
				return floatval(number_format($val, 9));
			}
		}

		return floatval($val);
	}

	public static function convertHTMLToEntities($htmlStr)
	{
		$htmlStr = str_replace('<', '&lt;', $htmlStr);
		$htmlStr = str_replace('>', '&gt;', $htmlStr);
		return $htmlStr;
	}

	public static function convertJsonStringOrObject($payload, $field = 'metadata')
	{
		$input = Commons::getProperty($payload, $field, '{}');

		if (!is_string($input) && !is_array($input)) {
			self::jsonFailure($input);
		}

		// Initialize
		$jsonStr = null;

		// Handle standard json object
		if (is_array($input)) {
			$jsonStr = json_encode($input);

			if (!is_object(json_decode($jsonStr))) {
				self::jsonFailure($input);
			}

			if (!json_last_error() === JSON_ERROR_NONE) {
				self::jsonFailure($input);
			}
		}

		// Handle hjson (must be stringified, otherwise it will fail)
		if (is_string($input)) {
			try {
				$parser = new HJSONParser();
				$hsjon = $parser->parse($input);
				$jsonStr = json_encode($hsjon);
				$jsonObj = json_decode($jsonStr);

				if (!is_object($jsonObj) && !is_array($jsonObj)) {
					self::jsonFailure($input);
				}
			} catch (\Exception $e) {
				self::jsonFailure($input);
			}
		}

		if (strlen($jsonStr) > 4000) {
			self::jsonFailure($input, true);
		}

		return $jsonStr;
	}

	private static function jsonFailure($input, $exceededMax = false)
	{
		$message =
			'Invalid json input. If the input is standard json, please make sure it is RFC-8259 compliant and if it is hjson, it must be stringified.';

		if ($exceededMax) {
			$message = 'The metadata field exceeded the max limit of 4000.';
		}

		ValidationHelper::fail($message, self::$errorCodes['json'], 'handle', __FILE__, __LINE__, [
			'hjson' => $input,
		]);
	}

	public static function deleteEntitiesWithRef($model, $entities)
	{
		if (empty($entities) || count($entities) <= 0) {
			ValidationHelper::fail(
				'Payload empty or invalid',
				'invalid_payload',
				'',
				__FILE__,
				__LINE__
			);
		}

		// https://github.com/laravel/framework/issues/2536
		$model
			::whereIn('ref', $entities->pluck('ref'))
			->get()
			->each->delete();
	}
}

Commons::init();
