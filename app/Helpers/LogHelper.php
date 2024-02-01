<?php
namespace App\Helpers;

use Carbon\Carbon;
use Exception;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Formatter\LineFormatter;
use Monolog\Formatter\JsonFormatter;
use Bugsnag\BugsnagLaravel\Facades\Bugsnag;

class LogHelper
{
	public static function log($type, $logData, $reportToBugSnag = false)
	{
		$errorData = !empty($logData['error']['data']) ? $logData['error']['data'] : null;
		$request = !empty($logData['request']) ? empty($logData['request']) : null;
		$logMsg = !empty($logData['msg']) ? $logData['msg'] : '';
		$userRef = !empty($logData['user_ref']) ? $logData['user_ref'] : '';
		$requestUrl = !empty($request) ? $request->url() : '';

		// Log the error everytime
		$logType = "HttpLog$type";
		LogHelper::$logType($requestUrl, $logMsg, $errorData, $userRef);

		// Send to BugSnag only when $reportToBugSnag is set to true and app env is PROD
		if ($reportToBugSnag && PROD) {
			Bugsnag::notifyError('Log Error', $logData['error']['msg'], function ($report) use (
				$errorData
			) {
				$report->setSeverity('error');
				$report->setMetaData($errorData);
			});
		}
	}

	public static function HttpLog400($url, $errorMessage, $payload, $userRef)
	{
		$log400 = config('app.log.400');

		if (empty($log400)) {
			return;
		}

		$log = [
			'url' => $url,
			'user_ref' => $userRef,
			'error' => $errorMessage,
			'payload' => $payload,
		];

		LogHelper::RawLog($log, $log400);
	}

	public static function HttpLog500($url, $errorMessage, $payload, $userRef)
	{
		$log500 = config('app.log.500');

		if (empty($log500)) {
			return;
		}

		$log = [
			'url' => $url,
			'user_ref' => $userRef,
			'error' => $errorMessage,
			'payload' => $payload,
		];

		LogHelper::RawLog($log, $log500);
	}

	public static function RawLog($payload, $filePath, $errorLevel = Logger::ERROR)
	{
		$dt = Carbon::now();

		if (!file_exists(dirname($filePath))) {
			mkdir(dirname($filePath), 0644, true);
		}

		$file = storage_path($filePath . '.' . $dt->format('Y.m.d') . '.log');
		$stream = new StreamHandler($file, $errorLevel);

		$formatter = new JsonFormatter();
		$stream->setFormatter($formatter);

		$customLog = new Logger('Custom');
		$customLog->pushHandler($stream, $errorLevel);
		$customLog->error('RawLog', $payload);
	}
}
