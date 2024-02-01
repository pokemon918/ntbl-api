<?php
namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use App\Exceptions\APIException;
use App\Helpers\FileHelper;
use App\Helpers\LogHelper;
use App\Helpers\StringHelper;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Arr;
use Exception;
use Request;

class ValidationHelper
{
	private static $ruleMessages = [];
	private static $errorCodes = [];
	private static $allowedFiles = [];

	public static function init()
	{
		if (empty(self::$ruleMessages)) {
			self::$ruleMessages = config('app.ruleMessages');
		}

		if (empty(self::$errorCodes)) {
			self::$errorCodes = config('app.errorCodes');
		}

		if (empty(self::$allowedFiles)) {
			self::$allowedFiles = config('app.fileUpload.allowedFiles');
		}
	}

	/**
	 * Checks the $pattern against the $value and see if it's valid
	 * @param string $pattern a valid pattern in string format.
	 * @param string $value string to check.
	 * @return boolean
	 */
	public static function isPatternValid($pattern, $value)
	{
		if (!is_string($pattern)) {
			return false;
		}

		try {
			$value = (string) $value;
		} catch (Exception $e) {
			return false;
		}

		// check if pattern has errors
		if (!preg_match($pattern, $value)) {
			return false;
		}

		// built check for non-printable and html chars
		if (self::hasNonPrintableCharsOrTags($value)) {
			return false;
		}

		return true;
	}

	public static function isValidLongText($value)
	{
		return preg_match(config('regex.valid_long_text'), $value);
	}

	public static function hasNonPrintableChars($value)
	{
		return preg_match(config('regex.non_print'), $value);
	}

	public static function hasNonPrintableCharsOrTags($value)
	{
		return preg_match(config('regex.non_print_or_tags'), $value);
	}

	public static function doesValueExists($value, $table, $column)
	{
		$result = DB::table($table)
			->where($column, '=', $value)
			->exists();

		return $result;
	}

	public static function isValidRef($ref, $extraRules = '')
	{
		if (empty($ref)) {
			return false;
		}

		$rules = 'required|max:255|valid_ref' . $extraRules;
		$refValidator = Validator::make(['ref' => $ref], ['ref' => $rules], self::$ruleMessages);

		if ($refValidator->fails()) {
			return false;
		}

		return true;
	}

	public static function hasRightsByOwnerRef($entity, $user)
	{
		if (isset($user->ref) && isset($entity->owner_ref) && $user->ref === $entity->owner_ref) {
			return true;
		}

		return false;
	}

	public static function hasRightsByOwnerId($entity, $user)
	{
		$authorized = false;

		if ($user->id === $entity->user_id) {
			$authorized = true;
		}

		return $authorized;
	}

	public static function validatePayload($payload)
	{
		if (empty($payload)) {
			self::fail(
				'Payload empty or invalid',
				self::$errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'payload' => $payload,
				]
			);
		}
	}

	public static function validateWithRules(
		$payload,
		$rules = null,
		$errorMsg = '',
		$errorKey = '',
		$errorField = ''
	) {
		if (empty($rules)) {
			$rules = Identity::$rules;
			$rules['name'] = User::$rules['name'];
			$rules['handle'] = User::$rules['handle'];
		}

		// Validate Identity fields
		$identityValidator = Validator::make($payload, $rules, self::$ruleMessages);
		self::checkValidatorForErrors($identityValidator, $errorMsg, $errorKey, $errorField);
	}

	public static function validateAccessType($value, $table, $col, $message = '')
	{
		$exists = self::doesValueExists(strtolower($value), $table, $col);

		if (empty($message)) {
			$message = 'Invalid access type';
		}

		if (!$exists) {
			self::fail($message, self::$errorCodes['exists'], 'visibility', __FILE__, __LINE__, [
				'accessType' => $value,
			]);
		}
	}

	public static function validateEntityExists($refOrHandle, $table, $column, $softdelete = true)
	{
		$softDeleteRule = $softdelete ? ',deleted_at,NULL' : null;
		$extraRules = '|exists:' . $table . ',' . $column . $softDeleteRule;

		if ($column == 'email') {
			self::validateEmail($refOrHandle, $column, $extraRules);
		} else {
			self::validateRefOrHandle($refOrHandle, $column, $extraRules);
		}
	}

	public static function validateTeamExists($refOrHandle, $table, $column)
	{
		self::validateRefOrHandle(
			$refOrHandle,
			$column,
			'|exists:' . $table . ',' . $column . ',deleted_at,NULL'
		);
	}

	public static function validateTeamAuthority($userRelations, $allowedRoles = [])
	{
		$currentUser = Auth::user();

		if (empty($userRelations)) {
			self::fail(
				'You dont have access to this team',
				self::$errorCodes['invalid_team_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'currentUser' => $currentUser,
					'userRelations' => $userRelations,
				]
			);
		}

		$teamAuthority = self::getTeamAuthority($userRelations, $allowedRoles);
		$authorized = array_get($teamAuthority, 'isAuthorized', false);
		$userAuthority = array_get($teamAuthority, 'authority', []);

		if (!$authorized) {
			self::fail(
				'You dont have access to this team',
				self::$errorCodes['invalid_team_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'currentUser' => $currentUser,
					'userRelations' => $userRelations,
				]
			);
		}

		return $userAuthority;
	}

	public static function getTeamAuthority($userRelations, $allowedRoles = [])
	{
		$currentUser = Auth::user();

		if (empty($userRelations)) {
			self::fail(
				'You dont have access to this team',
				self::$errorCodes['invalid_team_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'currentUser' => $currentUser,
					'userRelations' => $userRelations,
				]
			);
		}

		$authorized = false;
		$isOwner = false;
		$isAdmin = false;
		$isEditor = false;
		$isMember = false;
		$isLeader = false;

		foreach ($userRelations as $relation) {
			$key = $relation->relation_type->key;

			if (in_array($key, $allowedRoles)) {
				$authorized = true;
				${'is' . ucfirst($key)} = true;
			}
		}

		return [
			'isAuthorized' => $authorized,
			'authority' => [
				'isOwner' => $isOwner,
				'isAdmin' => $isAdmin,
				'isEditor' => $isEditor,
				'isMember' => $isMember,
				'isLeader' => $isLeader,
			],
		];
	}

	public static function validateRefOrHandleIsUnique($refOrHandle, $table, $column)
	{
		self::validateRefOrHandle($refOrHandle, $column, '|unique:' . $table . ',' . $column);
	}

	public static function validateRefOrHandle($ref, $column, $extraRules = '')
	{
		if (empty($ref)) {
			self::fail('Reference missing', self::$errorCodes['exists'], 'ref', __FILE__, __LINE__);
		}

		$maxLength = config('app.identity.refMaxLength');
		$customRule = '|valid' . ucfirst($column);
		$rules = "max:{$maxLength}" . $customRule . $extraRules;
		$refValidator = Validator::make(
			[$column => $ref],
			[$column => $rules],
			self::$ruleMessages
		);

		self::checkValidatorForErrors($refValidator);
	}

	public static function validateEntityOwnership($entity, $user, $by = 'ref')
	{
		switch ($by) {
			case 'ref':
				$authorized = self::hasRightsByOwnerRef($entity, $user);
				break;
			case 'id':
				$authorized = self::hasRightsByOwnerId($entity, $user);
				break;
			default:
				$authorized = false;
		}

		if (!$authorized) {
			self::fail(
				'You dont have access to this entity [' . $entity->ref . ']',
				self::$errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'entity' => $entity,
					'user' => $user,
				]
			);
		}
	}

	public static function validateEmail($email, $column, $extraRules = '')
	{
		if (empty($email)) {
			self::fail('Email missing', self::$errorCodes['exists'], 'email', __FILE__, __LINE__);
		}

		$maxLength = config('app.identity.emailMaxLength');
		$rules = "max:{$maxLength}" . $extraRules;
		$refValidator = Validator::make(
			[$column => $email],
			[$column => $rules],
			self::$ruleMessages
		);

		self::checkValidatorForErrors($refValidator);
	}

	public static function validateImage($expectedFile)
	{
		$allowedImages = self::$allowedFiles['images'];

		FileHelper::validateFile(
			$expectedFile,
			$allowedImages['ext'],
			$allowedImages['mime'],
			$allowedImages['maxBytes']
		);
	}

	public static function validateBase64Image($base64String, $field = 'avatar')
	{
		$dataComponents = explode(',', $base64String);
		$rawBase64 = array_pop($dataComponents);

		try {
			$imgdata = base64_decode($rawBase64);
		} catch (Exception $e) {
			ValidationHelper::fail(
				'Invalid base64 string',
				'invalid_base64_string',
				$field,
				__FILE__,
				__LINE__
			);
		}

		$infoResource = finfo_open();
		$mimeType = finfo_buffer($infoResource, $imgdata, FILEINFO_MIME_TYPE);
		$allowedImgExtensions = ['jpg', 'jpeg', 'png'];
		$validImgMimeType = false;

		foreach ($allowedImgExtensions as $ext) {
			if (strpos($mimeType, $ext) !== false) {
				$validImgMimeType = true;
				break;
			}
		}

		if (!$validImgMimeType) {
			ValidationHelper::fail(
				'Invalid image extension',
				'invalid_image_ext',
				$field,
				__FILE__,
				__LINE__
			);
		}
	}

	public static function validateJsonFile($expectedFile)
	{
		$allowedJsonFile = self::$allowedFiles['json'];

		FileHelper::validateFile(
			$expectedFile,
			$allowedJsonFile['ext'],
			$allowedJsonFile['mime'],
			$allowedJsonFile['maxBytes']
		);
	}

	public static function validateDataWithRules($data, $rules)
	{
		$refValidator = Validator::make($data, $rules, self::$ruleMessages);
		self::checkValidatorForErrors($refValidator);
	}

	public static function checkValidatorForErrors(
		$validator,
		$errorMsg = '',
		$errorKey = '',
		$errorField = '',
		$debugInfo = []
	) {
		if (
			!is_string($errorKey) ||
			!is_string($errorMsg) ||
			!is_string($errorField) ||
			!is_array($debugInfo)
		) {
			throw new Exception('Invalid method parameters');
		}
		if ($validator->fails()) {
			$failedValidations = $validator->failed();
			$errors = $validator->messages()->toArray();
			$rules = $validator->getRules();

			foreach ($failedValidations as $key => $value) {
				$code = $errorKey;

				if (empty($code)) {
					$codeRule = $rules[$key][0];
					$codeKey = strtolower(array_keys($value)[0]);
					$code =
						self::$errorCodes['in' . $codeRule] ??
						(self::$errorCodes[$codeKey] ?? $codeKey);
				}

				$errorMsg = !empty($errorMsg) ? $errorMsg : $errors[$key][0];
				$field = !empty($errorField) ? $errorField : $key;
				self::fail($errorMsg, $code, $field, __FILE__, __LINE__, $debugInfo);
			}
		}
	}

	public static function fail($msg, $code, $field, $file, $line, $debugInfo = [])
	{
		$msg = StringHelper::replaceWithOwnTerms($msg, 'coupon');
		$user = Auth::user();
		$userRef = '';

		//Because it'd be really bad if the error logger catched an error
		if (!empty($user)) {
			$userRef = $user->ref;
		}

		$request = request();
		$payload = $request->all();
		$url = $request->url();

		$logData = [
			'errorCode' => $code,
			'field' => $field,
			'file' => $file,
			'line' => $line,
			'debugInfo' => $debugInfo,
			'payload' => $payload,
		];

		LogHelper::HttpLog400($url, $msg, $logData, $userRef);
		throw new APIException($msg, $code, $field, $line);
	}

	public static function isCallbackValid($callback)
	{
		if (empty($callback)) {
			return false;
		}

		$pattern = config('regex.valid_callback');
		$reserved = [
			'break',
			'do',
			'instanceof',
			'typeof',
			'case',
			'else',
			'new',
			'var',
			'catch',
			'finally',
			'return',
			'void',
			'continue',
			'for',
			'switch',
			'while',
			'debugger',
			'function',
			'this',
			'with',
			'default',
			'if',
			'throw',
			'delete',
			'in',
			'try',
			'class',
			'enum',
			'extends',
			'super',
			'const',
			'export',
			'import',
			'implements',
			'let',
			'private',
			'public',
			'yield',
			'interface',
			'package',
			'protected',
			'static',
			'null',
			'true',
			'false',
		];

		$parts = explode('.', $callback);

		foreach ($parts as $part) {
			if (!preg_match($pattern, $part) || in_array($part, $reserved, true)) {
				return false;
			}
		}

		return true;
	}

	public static function isNotString($value)
	{
		return !is_string($value);
	}

	public static function isValidObject($value)
	{
		return is_object($value);
	}

	public static function checkForNonExistingKeysOrRefs(
		$refs,
		$refsFromDB,
		$entity = 'entity',
		$type = 'refs'
	) {
		$results = array_diff($refs, $refsFromDB);
		$nonExistingRefs = Arr::flatten($results);

		if (!empty($nonExistingRefs)) {
			self::fail(
				ucfirst($entity) .
					' ' .
					ucfirst($type) .
					' [' .
					implode(', ', $nonExistingRefs) .
					'] not found',
				self::$errorCodes['exists'],
				'ref',
				__FILE__,
				__LINE__,
				['non_existing_refs' => $nonExistingRefs]
			);
		}
	}

	public static function validateHjson($attribute, $value)
	{
		// Emulate payload
		$payload[$attribute] = $value;

		// Returns an error regardless if json is string/object , if invalid.
		$metadata = Commons::convertJsonStringOrObject($payload);

		return is_string($metadata);
	}

	public static function validateMetadata($payload)
	{
		// Returns an error regardless if json is string/object , if invalid.
		$metadata = Commons::convertJsonStringOrObject($payload);
	}
}

ValidationHelper::init();
