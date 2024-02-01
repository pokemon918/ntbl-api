<?php
namespace App\Services;

use Auth;
use Exception;
use Carbon\Carbon;
use HJSON\HJSONParser;
use Illuminate\Support\Facades\Validator;
use App\Helpers\Commons;
use App\Helpers\FileHelper;
use App\Helpers\StringHelper;
use App\Helpers\ValidationHelper;
use App\Models\User;
use App\Models\Collection;
use App\Models\CollectionType;
use App\Models\CollectionAccessType;
use App\Models\TeamCollection;
use App\Models\ContestTeam;
use App\Models\File;
use App\Models\RelationType;
use App\Models\Team;
use App\Models\TeamAccessType;
use App\Models\TeamUser;
use App\Models\TeamType;
use App\Models\TeamAction;
use App\Models\ActionType;
use App\Models\Impression;
use App\Models\CollectionImpression;

class CollectionService
{
	private $implementation = 'NTBL'; //Hardcoded fixed value for namespacing passwords
	private $errorMessage = '';
	private $errorKey = '';
	private $errorField = '';
	private $country = null;
	private $avatarPayloadKey = 'avatar';
	private $responseData = [];

	function __construct()
	{
		$this->refLength = config('app.identity.refLength');
		$this->refMaxLength = config('app.identity.refMaxLength');
		$this->ruleMessages = config('app.ruleMessages');
		$this->errorCodes = config('app.errorCodes');
		$this->fileRefLength = config('app.file.refLength');
		$this->impressionService = new ImpressionService();
	}

	public function getCollection($collectionRef)
	{
		$collection = Collection::where('ref', $collectionRef)
			->whereNull('deleted_at')
			->first();
		if (empty($collection)) {
			ValidationHelper::fail(
				'Collection [' . $collectionRef . '] does not exist.',
				$this->errorCodes['exists'],
				'',
				__FILE__,
				__LINE__,
				[
					'collection_ref' => $collectionRef,
				]
			);
		}
		return $collection;
	}

	public function getCollectionImpression($collection, $impression, $type)
	{
		return CollectionImpression::where([
			['collection_id', $collection->id],
			['impression_id', $impression->id],
			['type', $type],
		])->first();
	}

	public function getCollectionImpressions($collection, $build = false)
	{
		$impressions = CollectionImpression::with(
			'impression',
			'impression.origin',
			'impression.subject',
			'impression.individual',
			'impression.rating',
			'impression.collection',
			'impression.team',
			'impression.infos',
			'impression.impressionNotes.note',
			'impression.impressionFiles.file'
		)
			->where([
				'collection_id' => $collection->id,
			])
			->get()
			->pluck('impression');

		if ($build) {
			return $impressions->map(function ($impression) {
				return $this->impressionService->buildImpressionData($impression);
			});
		}

		return $impressions;
	}

	public function importCollectionImpressions($ref, $importData, $impressionKey = 'impressions')
	{
		$collection = Collection::where('ref', '=', $ref)->first();
		$owner = User::where('ref', '=', $collection->owner_ref)->first();
		$importImpressions = $this->extractImportImpressions($importData, $impressionKey);
		$impressionRefs = [];

		$importIndex = 0;
		foreach ($importImpressions as $importImpression) {
			$impression = $this->importImpression($importImpression, $collection, $importIndex);
			$impression->impression_type_id = 1;
			$impression->lifecycle_id = 1;
			$impression->save();
			$impressionRefs[] = $impression->ref;
			$importIndex++;
		}

		$rawImportedImpressions = $this->saveCollectionImpressions(
			$collection,
			$owner,
			$impressionRefs
		);

		$importedImpressions = array_map(function ($impression) {
			return $this->impressionService->buildImpressionData($impression);
		}, $rawImportedImpressions);

		return $importedImpressions;
	}

	public function archiveCollectionImpressions($collectionRef)
	{
		$collection = Collection::where('ref', '=', $collectionRef)->first();

		// Get all the "active" impressions that belongs to the collection
		$collectionImpressions = CollectionImpression::with('impression')
			->where([['collection_id', '=', $collection->id], ['type', '=', 'active']])
			->get();

		// Modify the type for each and every impressions to 'archived'
		foreach ($collectionImpressions as $colImp) {
			$colImp->type = 'archived';
			$colImp->save();
		}
	}

	public function getCollectionCreatedTastings($collection)
	{
		return Impression::where('collection_id', '=', $collection->id)
			->whereNull('deleted_at')
			->get();
	}

	public function getMoldImpressions($impressionRef)
	{
		return Impression::where([['mold', '=', $impressionRef], ['deleted_at', '=', null]])->get();
	}

	public function importImpression($importData, $collection, $importIndex)
	{
		// Validate imported data
		try {
			$this->impressionService->validateImpressionPayload($importData, false);
		} catch (Exception $e) {
			// Inject where in the file it encountered an error
			$errorMessage = "Error importing impression[{$importIndex}]. " . $e->getMessage();
			ValidationHelper::fail(
				$errorMessage,
				$e->getApiErrorCode(),
				$e->getField(),
				__FILE__,
				__LINE__,
				[
					'import_index' => $importIndex,
					'import_data' => $importData,
				]
			);
		}

		// Base Impression
		$impression = new Impression();
		$impression->ref = StringHelper::readableRefGenerator(
			$this->refLength,
			'impression',
			'ref'
		);
		$impression->lifecycle_id = 0;
		$impression->origin_id = 0;
		$impression->impression_type_id = 0;

		// Collection's owner will be the owner of the imported impressions
		$impression->owner_ref = $collection->owner_ref;
		// Signifies that this impression is born out of this collection
		$impression->collection_id = $collection->id;
		$impression->saveOriginCollection(Commons::getProperty($importData, 'collection'));
		$impression->saveOrigin(Commons::getProperty($importData, 'source'));
		$subject = $impression->saveSubject($importData);
		$impression->subject_id = $subject->id;

		// Save Impression to get Id
		$impression->save();

		// Parse hjson
		$impression->metadata = Commons::convertJsonStringOrObject($importData);

		// Save Impression Data
		$impression->saveIndividual($importData);
		$impression->saveStats(Commons::getProperty($importData, 'stats', []));
		$impression->saveRating(Commons::getProperty($importData, 'rating'));
		$impression->saveImpressionNotes(Commons::getProperty($importData, 'notes'));
		$impression->saveImpressionInfo(Commons::getProperty($importData, 'info'));
		return $impression;
	}

	protected function saveCollectionImpressions($collection, $user, $impressionRefs)
	{
		$impressions = Impression::with([
			'subject',
			'individual',
			'rating',
			'impressionNotes.note',
			'collection',
			'impressionFiles.file',
		])
			->whereIn('ref', $impressionRefs)
			->get();

		$impressionsAdded = [];

		// Validate and Save Impressions
		foreach ($impressions as $impression) {
			$this->validateEditImpressionPrivilege($impression, $user);
			$collectionImpression = CollectionImpression::firstOrCreate([
				'collection_id' => $collection->id,
				'impression_id' => $impression->id,
			]);
			array_push($impressionsAdded, $impression);
		}

		return $impressionsAdded;
	}

	protected function validateEditImpressionPrivilege($impression, $user)
	{
		$authorized = false;
		$authorized = ValidationHelper::hasRightsByOwnerRef($impression, $user);

		if (!$authorized) {
			ValidationHelper::fail(
				'You dont have access to this impression',
				$this->errorCodes['invalid_entity_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'current_user' => $user,
					'impression' => $impression,
				]
			);
		}
	}

	public function validateCollectionImportData($ref, $filePayloadKey = 'uploadedFile')
	{
		ValidationHelper::validateEntityExists($ref, 'collection', 'ref');
		ValidationHelper::validateJsonFile($filePayloadKey);
	}

	public function validateCollectionImpression($collection, $impression, $collectionImpression)
	{
		/* MRW: Hmm. Is this really a good validation? Just looking at if one parameter is empty? Todo: look at this*/

		if (empty($collectionImpression)) {
			ValidationHelper::fail(
				'Impression [' .
					$impression->ref .
					'] does not belong to this Collection [' .
					$collection->ref .
					'].',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'collection' => $collection->ref,
					'impression' => $impression->ref,
				]
			);
		}
	}

	public function extractImportImpressions($importData, $impressionKey)
	{
		$importImpressions = isset($importData[$impressionKey])
			? $importData[$impressionKey]
			: null;

		if (empty($importImpressions)) {
			ValidationHelper::fail(
				"The impressions you are trying to import is either empty or does not have a valid key of [{$impressionKey}]",
				$this->errorCodes['invalid_file'],
				'',
				__FILE__,
				__LINE__,
				[
					'impression_key' => $impressionKey,
					'import_data' => $importData,
				]
			);
		}

		return $importImpressions;
	}

	public function getTeamHostedCollections($team)
	{
		return TeamCollection::getWithCollectionsByTeamId($team->id)->pluck('collection');
	}
}
