<?php
namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Helpers\FileHelper;
use App\Helpers\StringHelper;
use App\Helpers\ValidationHelper;
use App\Helpers\Commons;
use App\Models\User;
use App\Models\Impression;
use App\Models\ImpressionFile;
use App\Models\ImpressionNote;
use App\Models\ImpressionType;
use App\Models\MarkedImpression;
use App\Models\Note;
use App\Models\File;
use App\Services\ImpressionService;

class TastingController extends ImpressionController
{
	const MODEL = 'App\Models\Impression';

	private $tasting = null;
	private $tastings = null;
	private $tastingImage = null;
	private $errorType = 'tasting';

	public function __construct()
	{
		parent::__construct();
		$this->impressionService = new ImpressionService();
	}

	public function add(Request $request)
	{
		try {
			// Validate the payload
			$payload = Commons::prepareData($request->post());
			$this->impressionService->validateImpressionPayload($payload);

			// Create Tasting
			$this->tasting = $this->createTasting($payload);

			// Add Tasting Data
			$this->addTastingData($payload);

			// Update necessary fields
			$this->tasting->impression_type_id = 1; // Update impression type to "wine"
			$this->tasting->lifecycle_id = 1; // Update impression status to "Fully created"
			$this->tasting->save();

			return $this->success(
				'Tasting created!',
				Response::HTTP_CREATED,
				$this->getTastingData($this->tasting->ref)
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function updateByRef($ref, Request $request)
	{
		try {
			// Validate the payload
			$payload = Commons::prepareData($request->post());
			$this->impressionService->validateImpressionPayload($payload, true);

			$ref = strtolower($ref);
			$this->validateImpressionRef($ref);

			$tasting = $this->updateTasting($ref, $payload);

			return $this->success(
				'Tasting updated!',
				Response::HTTP_OK,
				$this->getTastingData($tasting->ref)
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function delete(Request $request)
	{
		try {
			// Validate the payload
			$currentUser = Auth::user();
			$payload = Commons::prepareData($request->post());
			$this->validateDeleteTastingPayload($payload, $currentUser);
			$this->deleteImpressions($this->tastings);

			return $this->success('Tasting(s) deleted!', Response::HTTP_ACCEPTED, [
				'tasting_refs' => $this->tastings->pluck('ref'),
			]);
		} catch (Exception $e) {
			return $this->error($e);
		}
	}

	public function getList()
	{
		// Find all refs related to a specific imression
		// todo: handle pagination later
		// todo: Make sure this first fetch of data is reused for data so we dont call DB 101 times
		// Todo: add userbased selection
		try {
			$user = Auth::user();

			if (empty($user)) {
				$this->fail(
					'Unauthorized access',
					$this->errorCodes['invalid_access'],
					'',
					__FILE__,
					__LINE__
				);
			}

			$impressions = Impression::getByOwnerRef($user->ref);
			$tastingList = $impressions->map(function ($impression) {
				return $this->impressionService->buildImpressionData($impression);
			});

			return $tastingList;
		} catch (Exception $e) {
			$responseCode = Response::HTTP_BAD_REQUEST;

			if (empty($user)) {
				$responseCode = Response::HTTP_FORBIDDEN;
			}

			return $this->error($e, $this->errorType, $responseCode);
		}
	}

	public function getByRef($ref)
	{
		try {
			$ref = strtolower($ref);
			$this->validateImpressionRef($ref);
			return $this->getTastingData($ref);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addImage($ref, Request $request)
	{
		try {
			// Validate impresssion ref
			$this->validateImpressionRef($ref);

			// Validation
			$expectedFile = 'uploadedFile';
			ValidationHelper::validateImage($expectedFile);

			// Get impression by ref and set current impression value
			$this->impression = Impression::where('ref', '=', $ref)->first();

			// Init and store file
			$filePayload = $request->file($expectedFile);

			// Store File
			$fileInfo = FileHelper::storeFile($filePayload);

			// Save File
			$savedFile = $this->saveImpressionFile(
				$fileInfo,
				$this->impression->id,
				$this->refLength
			);

			// Return path and file ref
			return $this->success('Has a file', Response::HTTP_CREATED, [
				'fileRef' => $savedFile->ref,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function exportTastings($ref, Request $request)
	{
		try {
			ValidationHelper::validateEntityExists($ref, 'user', 'ref');

			$user = User::getUserByRef($ref);
			$impressions = Impression::getByOwnerRef($user->ref);
			$tastingList = $impressions->map(function ($impression) {
				$owner_ref = $impression->owner_ref;
				$impression = $this->impressionService->buildImpressionData(
					$impression,
					false,
					true
				);
				return $impression;
			});

			return [
				'wines' => $tastingList,
			];
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function markByRef($ref, Request $request)
	{
		try {
			$user = Auth::user();
			$ref = strtolower($ref);
			$this->validateMarkImpressionRef($ref);
			$impression = $this->getImpressionByRefWithoutOwnerRestriction($ref);
			$this->validateMarkImpression($user, $impression, $ref);
			$this->markImpression($user, $impression);

			return $this->success('Impression Marked!', Response::HTTP_OK, [
				'impression_ref' => $impression->ref,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function unmarkByRef($ref, Request $request)
	{
		try {
			$user = Auth::user();
			$ref = strtolower($ref);
			$this->validateMarkImpressionRef($ref);
			$impression = $this->getImpressionByRefWithoutOwnerRestriction($ref);
			$this->validateUnmarkImpression($user, $impression, $ref);
			$this->unmarkImpression($user, $impression);

			return $this->success('Impression Unmarked!', Response::HTTP_OK, [
				'impression_ref' => $ref,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getUserMarkedImpressions(Request $request)
	{
		try {
			$user = Auth::user();
			return $this->getMarkedImpressions($user);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getMarkedImpressionUsers($ref, Request $request)
	{
		try {
			$user = Auth::user();
			$ref = strtolower($ref);
			$this->validateMarkImpressionRef($ref);
			$impression = $this->getImpressionByRefWithoutOwnerRestriction($ref);
			$users = $this->getUsersThatMarkedImpression($impression);

			return [
				'users' => $users,
				'total' => count($users),
			];
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getAggregatedList($origin, Request $request)
	{
		try {
			// Format parameters
			$params = $this->prepareGetAggregatedParams($origin, $request->all());

			// Validate parameters
			$this->impressionService->validateFkey($params, false);

			// Fetch related data
			$aggregatedImpressions = $this->getAggregatedData($origin, $params);

			// Throw an error if nothing is found
			if ($aggregatedImpressions['impressions']['total'] <= 0) {
				$this->fail('Impression(s) not found.', null, null, __FILE__, __LINE__, null);
			}

			return $this->success(
				'Impression(s) found.',
				Response::HTTP_OK,
				$aggregatedImpressions
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	private function createTasting($payload)
	{
		// Create Impression Subject
		$this->impression = $this->createImpression($payload);
		return $this->impression;
	}

	private function updateTasting($ref, $payload)
	{
		$this->impression = $this->getImpressionByRef($ref);
		$this->updateImpression($payload);
		return $this->impression;
	}

	private function addTastingData($payload)
	{
		// Add Impression Data
		$this->addImpressionData($payload);
	}

	private function getTastingData($ref)
	{
		$impression = $this->getImpressionByRef($ref);
		return $this->impressionService->buildImpressionData($impression);
	}

	protected function validateDeleteTastingPayload($payload, $user)
	{
		ValidationHelper::validatePayload($payload);
		$wineRefs = Commons::getProperty($payload, 'wine_refs', []);

		ValidationHelper::validateWithRules(
			['wineRefs' => $wineRefs],
			['wineRefs' => 'required|array']
		);

		$wineType = ImpressionType::where('ref', 'wine')->first();
		$this->tastings = Impression::whereIn('ref', $wineRefs)
			->where('impression_type_id', '=', $wineType->id)
			->get();

		$this->validateDeleteImpressionPayload($wineRefs, $this->tastings, $user);
	}

	protected function validateMarkImpressionRef($ref)
	{
		ValidationHelper::validateDataWithRules(
			['impression_ref' => $ref],
			['impression_ref' => MarkedImpression::$rules['impression_ref']]
		);
	}

	protected function validateMarkImpression($user, $impression)
	{
		if (empty($impression)) {
			$this->fail(
				'Impression not found.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				null
			);
		}

		$markedImpression = $this->getMarkedImpression($user, $impression);
		if (!empty($markedImpression)) {
			$this->fail(
				'Impression is already marked.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'user_ref' => $user->ref,
					'impression_ref' => $impression->ref,
				]
			);
		}
	}

	protected function validateUnmarkImpression($user, $impression)
	{
		if (empty($impression)) {
			$this->fail(
				'Impression not found.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				null
			);
		}

		$markedImpression = $this->getMarkedImpression($user, $impression);
		if (empty($markedImpression)) {
			$this->fail(
				'Impression is not marked.',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'user_ref' => $user->ref,
					'impression_ref' => $impression->ref,
				]
			);
		}
	}

	protected function prepareGetAggregatedParams($origin, $params)
	{
		// If empty, return expected structure with unpopulated values to trigger validation
		// origin can never be empty due to its nature as a route parameter
		if (empty($origin) || empty($params) || !is_array($params)) {
			return [
				'fkey' => [
					'origin' => $origin,
					'subject_key' => null,
				],
			];
		}

		// Route is unauthenticated, but do a null safe removal in case it exists
		unset($params['who']);

		// Append origin in params
		$params['origin'] = $origin;

		// Make parameters case insensitive before wrapping it with 'fkey'
		$params = array_change_key_case($params, CASE_LOWER);

		// Prepare params for validator
		foreach ($params as $key => $value) {
			// Remove empty values
			if (empty(trim($value))) {
				unset($params[$key]);
				continue;
			}

			// Restore underscores
			if (strpos($key, '_') === false) {
				$newkey = str_replace('key', '_key', $key);
				if ($newkey != $key) {
					$params[$newkey] = $params[$key];
					unset($params[$key]);
				}
			}
		}

		// Wrap parameters with "fkey"
		$params = ['fkey' => $params];

		return $params;
	}
}
