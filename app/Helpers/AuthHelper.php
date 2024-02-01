<?php
namespace App\Helpers;

use Exception;
use Carbon\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Helpers\ValidationHelper;
use App\Models\User;
use App\Models\Identity;
use App\Helpers\LogHelper;
use App\Models\RequestHistory;
use App\Others\NTBL_Sign;
use Base32\Base32;

class AuthHelper
{
	private static $signature = null;
	private static $errorCodes = [];

	public static function init()
	{
		if (empty(self::$signature)) {
			self::$signature = new \stdClass();
		}
		if (empty(self::$errorCodes)) {
			self::$errorCodes = config('app.errorCodes');
		}
	}

	public static function authenticate($request)
	{
		$who = $request->input('who');

		if (empty($who)) {
			return null;
		}

		self::setWhoElements($who);

		$userReplay = AuthHelper::getUserReplay($request);
		if (!empty($userReplay)) {
			return $userReplay;
		}

		// Allow to use userreferences directly in DEV enviroment as ?who=tex
		if (AuthHelper::isDevEnvOrDevRef($request)) {
			$devRefs = config('app.devRefs');
			$devRefIndex = array_search(strtoupper($who), $devRefs);
			$userRef = null;

			if (is_int($devRefIndex)) {
				$userRef = $devRefs[$devRefIndex];
			}

			if (empty($who)) {
				$userRef = $devRefs[0];
			}

			return User::getUserByRef($userRef);
		}

		if (empty($who)) {
			return null;
		}

		if (!ValidationHelper::isValidRef(self::$signature->userRef, '|exists:user,ref')) {
			return null;
		}

		// Make sure that dev refs cannot be used in PROD
		if (!DEV && strlen(self::$signature->userRef) < 4) {
			return null;
		}

		// Validate that clientTime is less than X hours old
		if (!AuthHelper::isTimeStampValid($who)) {
			return null;
		}

		$identity = User::getUserByRef(self::$signature->userRef);

		if (empty($identity)) {
			return null;
		}

		// if DEV no digest or clientTime is needed
		if (DEV && '' === self::$signature->digestHash) {
			return $identity;
		}

		// Make sure request digest is valid
		if (AuthHelper::isValidDigestHash($request, $identity->hpass)) {
			return $identity;
		}

		AuthHelper::fail(
			'Invalid Credentials.',
			'who',
			self::$errorCodes['user_credentials'],
			__LINE__
		);
	}

	public static function setWhoElements($who)
	{
		if (!empty((array) self::$signature)) {
			if (self::$signature->who === $who) {
				return self::$signature;
			}
		}

		self::$signature->who = $who;
		self::$signature->elements = explode(':', Base32::decode($who));
		self::$signature->userRef = array_shift(self::$signature->elements);
		self::$signature->clientTime = (int) array_shift(self::$signature->elements);
		self::$signature->digestHash = implode(':', self::$signature->elements);
		self::$signature->currentTime = (microtime(1) * 1000) | 0;
		return self::$signature;
	}

	public static function getClientTime()
	{
		$who = request()->input('who');

		if (empty($who) || AuthHelper::isDevRef($who)) {
			return null;
		}

		$signature = AuthHelper::setWhoElements($who);
		return Carbon::createFromTimestamp($signature->clientTime / 1000)->format('Y-m-d H:i:s');
	}

	public static function requestUsedMoreThanOnce($who)
	{
		if (self::isAdmin()) {
			return false;
		}

		self::setWhoElements($who);

		try {
			self::saveRequest([
				'who' => $who,
				'client_time' => Carbon::createFromTimestamp(
					self::$signature->clientTime / 1000
				)->format('Y-m-d H:i:s'),
				'userRef' => self::$signature->userRef,
			]);
		} catch (Exception $e) {
			$logData = [
				'request' => request(),
				'user_ref' => self::$signature->userRef,
				'msg' => $e->getMessage(),
				'error' => [
					'msg' => 'Invalid session.',
					'data' => [
						'who' => $who,
						'client_time' => self::$signature->clientTime,
						'user_ref' => self::$signature->userRef,
					],
				],
			];

			LogHelper::log(500, $logData);

			return true;
		}

		return false;
	}

	public static function throttleUserRequest($who)
	{
		self::setWhoElements($who);
		$intervalInMins = config('app.throttleInterval', 1);

		$currentTimeStamp = time();
		$currentTime = Carbon::createFromTimestamp($currentTimeStamp)->format('Y-m-d H:i:s');

		$throttleTimeStamp = $currentTimeStamp - $intervalInMins * 60;
		$throttleTime = Carbon::createFromTimestamp($throttleTimeStamp)->format('Y-m-d H:i:s');

		$previousRequests = RequestHistory::where([
			['user_ref', '=', self::$signature->userRef],
			['client_time', '<=', $currentTime],
			['client_time', '>=', $throttleTime],
		])->count();

		return $previousRequests;
	}

	public static function saveRequest($request)
	{
		$requestHistory = new RequestHistory();
		$requestHistory->who = $request['who'];
		$requestHistory->client_time = $request['client_time'];
		$requestHistory->user_ref = $request['userRef'];
		$requestHistory->created_at = Carbon::now()->format('Y-m-d H:i:s');
		$requestHistory->save();
	}

	public static function fail($message, $field, $errorCode, $lineNo, $statusCode = 400)
	{
		$authError = [
			'status' => 'error',
			'statusCode' => $statusCode,
			'message' => $message,
			'error' => [
				'code' => $errorCode,
				'field' => $field,
				'type' => 'user',
			],
		];

		header('Content-Type: application/json', true, $statusCode);
		echo json_encode($authError);
		die($lineNo);
	}

	public static function isAdmin()
	{
		return config('app.admin', false);
	}

	public static function getUserReplay($request)
	{
		if ($request->is('admin/replay*')) {
			if (IS_WHITELISTED) {
				$payload = $request->post();

				if (empty($payload['replay'])) {
					self::fail(
						'replay not set.',
						'replay',
						self::$errorCodes['invalid_payload'],
						__LINE__
					);
				}

				$replay = json_decode($payload['replay']);
				$replayUserRef = $replay->user_ref;
				$identity = User::getUserByRef($replayUserRef);

				if (!$identity) {
					self::fail(
						'replay not set.',
						'replay',
						self::$errorCodes['invalid_payload'],
						__LINE__
					);
				}

				return $identity;
			}
		}

		return null;
	}

	public static function isDevRef($who)
	{
		$devRefs = config('app.devRefs');
		return in_array(strtoupper($who), $devRefs);
	}

	public static function isDevEnvOrDevRef($request)
	{
		if ((DEV || $request->is('admin/*')) && strlen($request->input('who')) < 4) {
			return true;
		}

		return false;
	}

	public static function isValidDigestHash($request, $hpass)
	{
		$who = $request->input('who');
		self::setWhoElements($who);

		$hmac = self::$signature->userRef;
		$hmac .= $request->method();
		$hmac .= trim($request->path(), '/');
		$hmac .= self::$signature->clientTime;
		$hmac = strtolower($hmac);

		$validDigest = NTBL_Sign::hmac_sha256($hmac, $hpass);
		$validDigestHash = NTBL_Sign::sha3_shake256($validDigest);

		return self::$signature->digestHash === $validDigestHash;
	}

	public static function isTimeStampValid($who)
	{
		self::setWhoElements($who);
		$elapsedMs = self::$signature->currentTime - self::$signature->clientTime;
		$minMs = config('app.clientTimeMaxHoursOld') * 60 * 60 * 1000;
		$maxMs = config('app.clientTimeMaxHoursAhead') * 60 * 60 * 1000;
		$expired = $elapsedMs > $minMs;
		$farAhead = $elapsedMs * -1 > $maxMs;

		if ($expired || $farAhead) {
			$logData = [
				'request' => request(),
				'user_ref' => self::$signature->userRef,
				'msg' => 'Invalid timestamp in signature',
				'error' => [
					'msg' => 'Invalid timestamp',
					'data' => [
						'userRef' => self::$signature->userRef,
						'currentTime' => self::$signature->currentTime,
						'clientTime' => self::$signature->clientTime,
						'file' => __FILE__,
						'line' => __LINE__,
					],
				],
			];

			LogHelper::log(500, $logData, true);

			return false;
		}

		return true;
	}
}

AuthHelper::init();
