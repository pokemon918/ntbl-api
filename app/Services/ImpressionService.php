<?php
namespace App\Services;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use App\Models\Impression;
use App\Models\ImpressionNote;
use App\Models\ImpressionFile;
use App\Models\ImpressionInfo;
use App\Models\ImpressionInfoType;
use App\Models\Origin;
use App\Models\Lifecycle;
use App\Models\Subject;
use App\Models\Individual;
use App\Models\Stats;
use App\Models\Rating;
use App\Models\Note;
use App\Models\File;
use App\Models\Collection;
use App\Models\CollectionImpression;
use App\Models\Fkey;
use App\Helpers\Commons;
use App\Helpers\ValidationHelper;

class ImpressionService
{
	function __construct()
	{
		$this->refLength = config('app.identity.refLength');
		$this->refMaxLength = config('app.identity.refMaxLength');
		$this->ruleMessages = config('app.ruleMessages');
		$this->errorCodes = config('app.errorCodes');
		$this->fileRefLength = config('app.file.refLength');
		$this->validNoteTypes = config('app.notes.validType');
	}

	public function getImpression($impressionRef, $queryOnly = false)
	{
		$impression = Impression::where('ref', $impressionRef)
			->whereNull('deleted_at')
			->first();
		if (empty($impression) && !$queryOnly) {
			ValidationHelper::fail(
				'Impression [' . $impressionRef . '] does not exist.',
				$this->errorCodes['exists'],
				'',
				__FILE__,
				__LINE__,
				[
					'impression' => $impressionRef,
				]
			);
		}

		return $impression;
	}

	public function buildImpressionData($impression, $raw = false, $export = false)
	{
		if (empty($impression) && !($impression instanceof Impression)) {
			return null;
		}

		// Build and organize tasting data
		$tastingData = [
			// Internal
			'ref' => $impression->ref,
			'name' => $impression->subject->name,
			'producer' => $impression->subject->producer,
			'country' => $impression->subject->country,
			'region' => $impression->subject->region,
			'vintage' => $impression->subject->vintage,
			'grape' => $impression->subject->grape,
			'location' => $impression->individual->location,
			'summary_wine' => $impression->individual->summary_wine,
			'summary_personal' => $impression->individual->summary_personal,
			'food_pairing' => $impression->individual->food_pairing,
			'rating' => $this->extractRatingData($impression->rating),
			'notes' => $this->extractNotesByType($impression->impressionNotes),
			'images' => $impression->impressionFiles->pluck('file')->pluck('ref'),
			'created_at' => $impression->created_at,
			'price' => floatval($impression->subject->price),
			'currency' => $impression->subject->currency,
			'clean_key' => $impression->subject->clean_key,
			'producer_key' => $impression->subject->producer_key,
			'country_key' => $impression->subject->country_key,
			'region_key' => $impression->subject->region_key,
			'source' => !empty($impression->origin) ? $impression->origin->flow : null,
			'info' => $this->extractInfo($impression->infos, $impression->individual),
			'metadata' => $impression->metadata,
			// External
			'mold' => $impression->mold,
			'team' => !empty($impression->team) ? $impression->team->ref : null,
			'collection' => !empty($impression->collection) ? $impression->collection->ref : null,
		];

		if ($export) {
			$tastingData['replay'] = [
				'user_ref' => $impression->owner_ref,
			];
		}

		if ($raw) {
			$this->devAccessOnly();

			$rawImpressionData = [
				'impression' => $impression,
				'lifecycle' => $impression->lifecycle,
				'origin' => $impression->origin,
				'subject' => $impression->subject,
				'individual' => $impression->individual,
				'stats' => $impression->stats,
				'metadata' => $impression->metadata,
				'rating' => !empty($impression->rating) ? $impression->rating : new \stdClass(),
				'notes' => $this->extractNotesByType($impression->impressionNotes),
				'info' => $this->extractInfo($impression->infos, $impression->individual),
			];

			return $rawImpressionData;
		}

		return $tastingData;
	}

	private function extractNotesByType($impressionNotes)
	{
		if ($impressionNotes->isEmpty()) {
			return new \stdClass();
		}

		// Extract note id's
		$impressionNotes = $impressionNotes
			->groupBy('type')
			->groupBy('note_id')
			->toArray();

		// Bring array one level up
		$impressionNotes = array_get($impressionNotes, '', []);

		// Bring arrays one level up
		$impressionNotes = array_merge(...$impressionNotes);

		// Extract notes
		$notesByCategory = [];
		foreach ($impressionNotes as $impressionNote) {
			$category = array_get($impressionNote, 'type');
			$notes = array_get($impressionNote, 'note.key');
			$notesByCategory[$category][] = $notes;
		}

		return $notesByCategory;
	}

	private function extractRatingData($rating)
	{
		// Init rating data
		$ratingData = new \stdClass();

		// Build, organize and convert required rating data
		if (!empty($rating)) {
			$ratingData = [
				'final_points' => intval($rating->final_points),
				'balance' => floatval($rating->balance),
				'length' => floatval($rating->length),
				'intensity' => floatval($rating->intensity),
				'terroir' => floatval($rating->terroir),
				'complexity' => floatval($rating->complexity),
			];
		}

		return $ratingData;
	}

	private function extractInfo($infos, $individual)
	{
		if (empty($infos) || count($infos) <= 0) {
			return new \stdClass();
		}

		// Build, organize and convert required info
		$infoData = [];
		if (!empty($infos)) {
			foreach ($infos as $info) {
				$infoData[$info->field] = $info->info ?: $info->value;
			}
		}

		$infoData = $this->extractLegacyInfo($infoData, $individual);

		return $infoData;
	}

	private function extractLegacyInfo($infoData, $individual)
	{
		$legacyFields = ['drinkability', 'maturity'];
		$infoKeys = array_keys($infoData);

		foreach ($legacyFields as $legacyField) {
			if (!in_array($legacyField, $infoKeys)) {
				$legacyColumn = $legacyField . '_legacy';
				$legacyValue = (float) $individual->$legacyColumn;

				if (!empty($legacyValue)) {
					$infoData[$legacyField] = $legacyValue;
				}
			}
		}

		return $infoData;
	}

	public function validateImpressionPayload($payload, $updateExisting = false)
	{
		ValidationHelper::validatePayload($payload);
		$this->validateName($payload, $updateExisting);
		$this->validateOrigin($payload);
		$this->validateSubject($payload);
		$this->validateIndividual($payload);
		$this->validateStats($payload);
		$this->validateRating($payload);
		$this->validateNotes($payload);
		$this->validateImpressionInfo($payload);
		ValidationHelper::validateMetadata($payload);
		$this->validateCollection($payload);
		$this->validateMold($payload);
		$this->validateFkey($payload, $updateExisting);
	}

	public function validateFkey($payload, $updateExisting)
	{
		$fkey = Commons::getProperty($payload, 'fkey');

		if (empty($fkey)) {
			return;
		}

		// if fkey is included when updating an impression, return an error
		if ($updateExisting && array_key_exists('fkey', $payload)) {
			ValidationHelper::fail(
				'The fkey data can not be provided when updating.',
				$this->errorCodes['fkey_updating_not_allowed'],
				'fkey',
				__FILE__,
				__LINE__,
				[
					'fkey' => $payload['fkey'],
				]
			);
		}

		// if the json is not an object ignore fkey
		if (!is_string($fkey) && !is_array($fkey)) {
			return;
		}

		$fkeyJsonStr = Commons::convertJsonStringOrObject($payload, 'fkey');
		$fkeyJsonObj = json_decode($fkeyJsonStr);
		$fkeyJsonArr = get_object_vars($fkeyJsonObj);

		// Check for whitelisted property names
		$this->validateFkeyProperties($fkeyJsonObj);

		// Validate Fkey Model fields
		$rules = [
			'origin' => Fkey::$rules['origin'],
			'subject_key' => Fkey::$rules['subject_key'],
			'event_key' => Fkey::$rules['event_key'],
			'client_key' => Fkey::$rules['client_key'],
			'producer_key' => Fkey::$rules['producer_key'],
		];

		$fkeyValidator = Validator::make($fkeyJsonArr, $rules, $this->ruleMessages);
		ValidationHelper::checkValidatorForErrors($fkeyValidator);

		// Check for whitelisted origin values
		$this->validateFkeyOrigin($fkeyJsonObj);
	}

	public function validateFkeyProperties($fkeyJsonObj)
	{
		foreach ($fkeyJsonObj as $key => $value) {
			if (!in_array($key, config('app.fkey_allowed_properties'))) {
				ValidationHelper::fail(
					"[{$key}] is not an allowed property for fkey.",
					$this->errorCodes['fkey_field_not_allowed'],
					'fkey',
					__FILE__,
					__LINE__,
					[
						$key => $value,
					]
				);
			}
		}
	}

	public function validateFkeyOrigin($fkeyJsonObj)
	{
		if (!in_array($fkeyJsonObj->origin, config('app.fkey_allowed_origin_values'))) {
			ValidationHelper::fail(
				"[{$fkeyJsonObj->origin}] is not an allowed value for fkey.origin",
				$this->errorCodes['fkey_origin_invalid'],
				'origin',
				__FILE__,
				__LINE__,
				[
					'origin' => $fkeyJsonObj->origin,
				]
			);
		}
	}

	public function validateName($payload, $updateExisting)
	{
		if ($updateExisting && !array_key_exists('name', $payload)) {
			return;
		}

		$nameData = Commons::getProperty($payload, 'name');
		$nameRule = Subject::$rules['name'] . ($updateExisting ? '|filled' : '|required');

		$subjectValidator = Validator::make(
			['name' => $nameData],
			['name' => $nameRule],
			$this->ruleMessages
		);
		ValidationHelper::checkValidatorForErrors($subjectValidator);
	}

	public function validateOrigin($payload)
	{
		if (empty($payload['source'])) {
			return;
		}

		// Validate Origin Model fields
		$rawOrigin = explode('/', $payload['source'], 3);

		if (!is_array($rawOrigin) || (is_countable($rawOrigin) && count($rawOrigin) != 3)) {
			$errorMessage = 'Invalid source format.';

			if (DEV) {
				$errorMessage .=
					' (Please format as <tasting-flow>/<client-codename>/<build-version>)';
			}

			ValidationHelper::fail(
				$errorMessage,
				$this->errorCodes['invalid_source'],
				'source',
				__FILE__,
				__LINE__,
				[
					'source' => $payload['source'],
				]
			);
		}

		$flow = trim(array_get($rawOrigin, '0'));
		$client = trim(array_get($rawOrigin, '1'));
		$version = trim(array_get($rawOrigin, '2'));

		$origin = [
			'flow' => $flow,
			'client' => $client,
			'version' => $version,
		];

		$originValidator = Validator::make($origin, Origin::$rules, $this->ruleMessages);
		ValidationHelper::checkValidatorForErrors($originValidator);
	}

	public function validateSubject($payload)
	{
		$subject = [
			'name' => Commons::getProperty($payload, 'name'),
			'producer' => Commons::getProperty($payload, 'producer'),
			'country' => Commons::getProperty($payload, 'country'),
			'region' => Commons::getProperty($payload, 'region'),
			'vintage' => Commons::getProperty($payload, 'vintage'),
			'grape' => Commons::getProperty($payload, 'grape'),
			'price' => Commons::getProperty($payload, 'price'),
			'currency' => Commons::getProperty($payload, 'currency'),
			'clean_key' => Commons::getProperty($payload, 'clean_key'),
			'producer_key' => Commons::getProperty($payload, 'producer_key'),
			'country_key' => Commons::getProperty($payload, 'country_key'),
			'region_key' => Commons::getProperty($payload, 'region_key'),
		];

		$rules = [
			'name' => Subject::$rules['name'],
			'producer' => Subject::$rules['producer'],
			'country' => Subject::$rules['country'],
			'region' => Subject::$rules['region'],
			'vintage' => Subject::$rules['vintage'],
			'grape' => Subject::$rules['grape'],
			'price' => Subject::$rules['price'],
			'currency' => Subject::$rules['currency'],
			'clean_key' => Subject::$rules['clean_key'],
			'producer_key' => Subject::$rules['producer_key'],
			'country_key' => Subject::$rules['country_key'],
			'region_key' => Subject::$rules['region_key'],
		];

		// Validate Subject Model fields
		$subjectValidator = Validator::make($subject, $rules, $this->ruleMessages);
		ValidationHelper::checkValidatorForErrors($subjectValidator);
	}

	public function validateIndividual($payload)
	{
		$payload['summary_wine'] = Commons::convertHTMLToEntities(
			Commons::getProperty($payload, 'summary_wine')
		);
		$payload['summary_personal'] = Commons::convertHTMLToEntities(
			Commons::getProperty($payload, 'summary_personal')
		);
		$payload['food_pairing'] = Commons::convertHTMLToEntities(
			Commons::getProperty($payload, 'food_pairing')
		);

		$individual = [
			'summary_wine' => $payload['summary_wine'],
			'summary_personal' => $payload['summary_personal'],
			'food_pairing' => $payload['food_pairing'],
			'location' => Commons::getProperty($payload, 'location'),
		];

		$rules = [
			'summary_wine' => Individual::$rules['summary_wine'],
			'summary_personal' => Individual::$rules['summary_personal'],
			'food_pairing' => Individual::$rules['food_pairing'],
			'location' => Individual::$rules['location'],
		];

		//If GPS is Empty , Dont Validate GPS Fields
		$gpsRaw = Commons::getProperty($payload, 'gps');
		if (!empty($gpsRaw)) {
			$individual['lat'] = Commons::getProperty($gpsRaw, 'lat');
			$individual['long'] = Commons::getProperty($gpsRaw, 'long');
			$rules['lat'] = Individual::$rules['lat'];
			$rules['long'] = Individual::$rules['long'];
		}

		$individualValidator = Validator::make($individual, $rules, $this->ruleMessages);

		ValidationHelper::checkValidatorForErrors($individualValidator);
	}

	public function validateStats($payload)
	{
		if (empty($payload['stats'])) {
			return;
		}

		// Validate Stats Model fields
		$stats = $payload['stats'];

		if (!is_array($stats)) {
			ValidationHelper::fail(
				'Invalid stats format',
				$this->errorCodes['valid_stats'],
				'stats',
				__FILE__,
				__LINE__,
				[
					'stats' => $payload['stats'],
				]
			);
		}

		foreach ($stats as $statObj) {
			$key = key($statObj);
			$stat = ['event' => trim($key), 'value' => $statObj[$key]];

			$statsValidator = Validator::make(
				$stat,
				['event' => Stats::$rules['event'], 'value' => Stats::$rules['value']],
				$this->ruleMessages
			);

			ValidationHelper::checkValidatorForErrors($statsValidator);
		}
	}

	public function validateRating($payload)
	{
		if (empty($payload['rating'])) {
			return;
		}

		$rating = $payload['rating'];
		$this->validateForStringValues($rating);

		$rating = [
			'version' => array_get($rating, 'version'),
			'final_points' => number_format($rating['final_points'], 9),
			'balance' => number_format($rating['balance'], 9),
			'length' => number_format($rating['length'], 9),
			'intensity' => number_format($rating['intensity'], 9),
			'terroir' => number_format($rating['terroir'], 9),
			'complexity' => number_format($rating['complexity'], 9),
		];

		// Validate Rating Model fields
		$ratingValidator = Validator::make(
			$rating,
			[
				'version' => Rating::$rules['version'],
				'final_points' => Rating::$rules['final_points'],
				'balance' => Rating::$rules['balance'],
				'length' => Rating::$rules['length'],
				'intensity' => Rating::$rules['intensity'],
				'terroir' => Rating::$rules['terroir'],
				'complexity' => Rating::$rules['complexity'],
			],
			$this->ruleMessages
		);
		ValidationHelper::checkValidatorForErrors($ratingValidator);
	}

	public function validateForStringValues($rating)
	{
		$rule = 'required|not_string';
		$ratingValidator = Validator::make(
			$rating,
			[
				'final_points' => $rule,
				'balance' => $rule,
				'length' => $rule,
				'intensity' => $rule,
				'terroir' => $rule,
				'complexity' => $rule,
			],
			$this->ruleMessages
		);
		ValidationHelper::checkValidatorForErrors($ratingValidator);
	}

	public function validateImpressionInfo($payload)
	{
		if (empty($payload['info'])) {
			return;
		}

		$impressionInfo = Commons::getProperty($payload, 'info');
		if (!is_array($impressionInfo)) {
			ValidationHelper::fail(
				'Invalid info format',
				$this->errorCodes['invalid_impression_info'],
				'stats',
				__FILE__,
				__LINE__,
				[
					'impression_info' => $impressionInfo,
				]
			);
		}

		foreach ($impressionInfo as $infoKey => $value) {
			$infoType = ImpressionInfoType::where('key', '=', $infoKey)->first();

			if (empty($infoType)) {
				ValidationHelper::fail(
					'This info field type [' . $infoKey . '] does not exist.',
					$this->errorCodes['invalid_impression_info'],
					'stats',
					__FILE__,
					__LINE__,
					[
						'impression_info' => $impressionInfo,
					]
				);
			}

			$infoValidator = Validator::make(
				[
					'info_type' => $infoKey,
					$infoType->value_type . '_' . $infoKey => $value,
				],
				[
					'info_type' => ImpressionInfo::$rules['field'],
					$infoType->value_type . '_' . $infoKey => ImpressionInfo::$rules[
						$infoType->value_type
					],
				],
				$this->ruleMessages
			);
			ValidationHelper::checkValidatorForErrors($infoValidator);
		}
	}

	public function validateCollection($payload)
	{
		$collectionRef = Commons::getProperty($payload, 'collection');

		if (empty($collectionRef)) {
			return;
		}

		if (!is_string($collectionRef)) {
			ValidationHelper::fail(
				'Invalid collection format',
				$this->errorCodes['valid_entity'],
				'collection',
				__FILE__,
				__LINE__,
				[
					'collection' => $payload['collection'],
				]
			);
		}

		$collectionValidator = Validator::make(
			['collection' => $collectionRef],
			['collection' => 'string|valid_ref|exists:collection,ref'],
			$this->ruleMessages
		);

		ValidationHelper::checkValidatorForErrors($collectionValidator);
	}

	public function validateMold($payload)
	{
		$mold = array_get($payload, 'mold', null);
		$collectionValidator = Validator::make(
			['mold' => $mold],
			['mold' => Impression::$rules['mold']],
			$this->ruleMessages
		);
		ValidationHelper::checkValidatorForErrors($collectionValidator);
	}

	public function validateNotes($payload)
	{
		$notes = Commons::getProperty($payload, 'notes');

		if (empty($notes)) {
			return;
		}

		// Make sure that notes is an object
		if (!is_object(json_decode(json_encode($notes)))) {
			ValidationHelper::fail(
				'The notes field is not a valid object.',
				$this->errorCodes['invalid_object'],
				'notes',
				__FILE__,
				__LINE__,
				[
					'notes' => $notes,
				]
			);
		}

		$rules = ['notes' => Impression::$rules['notes']];
		$notesValidator = Validator::make(['notes' => $notes], $rules, $this->ruleMessages);
		ValidationHelper::checkValidatorForErrors($notesValidator);

		foreach ($notes as $type => $val) {
			$this->validateNoteType($type);
			$this->validateNote($val);
		}
	}

	public function validateNoteType($type)
	{
		if (!in_array($type, $this->validNoteTypes)) {
			ValidationHelper::fail(
				'Invalid note type',
				$this->errorCodes['invalid_note_type'],
				'notes',
				__FILE__,
				__LINE__,
				[
					'type' => $type,
				]
			);
		}
	}

	public function validateNote($note)
	{
		if (empty($note)) {
			return;
		}

		$noteKeyValidator = Validator::make(
			['note' => $note],
			['note' => 'array'],
			$this->ruleMessages
		);
		ValidationHelper::checkValidatorForErrors($noteKeyValidator);

		// Get notes based on the given notes in the payload
		$results = Note::whereIn('key', $note)->get();
		$this->checkForNonExistingNoteKeys($note, $results);
		$this->checkForDeprecatedNoteKeys($note, $results);

		// Additional validation for each and every note keys
		foreach ($note as $noteKey) {
			$this->validateNoteKey($noteKey);
		}
	}

	public function validateNoteKey($noteKey)
	{
		$noteKeyValidator = Validator::make(
			['note_key' => $noteKey],
			['note_key' => 'string|max:255|valid_ref'],
			$this->ruleMessages
		);
		ValidationHelper::checkValidatorForErrors($noteKeyValidator);
	}

	public function checkForDeprecatedNoteKeys($note, $validNotesFromDB)
	{
		$deprecatedNotes = $validNotesFromDB->where('deprecated', '=', 1)->toArray();
		$keys = Arr::pluck($deprecatedNotes, 'key');

		if (!empty($deprecatedNotes)) {
			ValidationHelper::fail(
				'Note keys ' . json_encode($keys) . ' are deprecated',
				$this->errorCodes['exists'],
				'ref',
				__FILE__,
				__LINE__,
				['deprecated_notes' => $deprecatedNotes]
			);
		}
	}

	public function checkForNonExistingNoteKeys($note, $validNotesFromDB)
	{
		$results = array_diff($note, $validNotesFromDB->pluck('key')->toArray());
		$nonExistingKeys = Arr::flatten($results);

		if (!empty($nonExistingKeys)) {
			ValidationHelper::fail(
				'Note keys [' . implode(', ', $nonExistingKeys) . '] don\'t exist',
				$this->errorCodes['exists'],
				'ref',
				__FILE__,
				__LINE__,
				['non_existing_keys' => $nonExistingKeys]
			);
		}
	}

	protected function devAccessOnly()
	{
		if (!DEV) {
			throw new Exception('Bad request');
		}
	}
}
