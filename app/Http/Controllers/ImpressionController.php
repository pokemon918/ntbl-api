<?php
namespace App\Http\Controllers;

use Exception;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Origin;
use App\Models\Lifecycle;
use App\Models\Subject;
use App\Models\Individual;
use App\Models\Stats;
use App\Models\Rating;
use App\Models\Impression;
use App\Models\ImpressionNote;
use App\Models\ImpressionFile;
use App\Models\ImpressionInfo;
use App\Models\ImpressionInfoType;
use App\Models\MarkedImpression;
use App\Models\Note;
use App\Models\File;
use App\Models\Collection;
use App\Models\CollectionImpression;
use App\Models\Fkey;
use App\Helpers\StringHelper;
use App\Helpers\FileHelper;
use App\Helpers\ValidationHelper;
use App\Helpers\Commons;
use App\Services\ImpressionService;
use App\Services\TeamService;

class ImpressionController extends Controller
{
	const MODEL = 'App\Models\Impression';

	protected $impression = null;
	protected $refLength = 0;
	private $errorType = 'impression';

	public function __construct()
	{
		parent::__construct();
		$this->refLength = config('app.impression.refLength');
		$this->validNoteTypes = config('app.notes.validType');
		$this->middleware('devAccessOnly', ['only' => ['getRawImpression']]);
		$this->impressionService = new ImpressionService();
		$this->teamService = new TeamService();
	}

	public function getRawImpression($ref)
	{
		try {
			$this->devAccessOnly();

			$ref = strtolower($ref);
			$this->validateImpressionRef($ref);

			return $this->getRawImpressionDataByRef($ref);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function markImpression($user, $impression)
	{
		$markedImpression = $this->getMarkedImpression($user, $impression);

		if (!empty($markedImpression)) {
			return $impression;
		}

		$markedImpression = new MarkedImpression();
		$markedImpression->user_id = $user->id;
		$markedImpression->impression_id = $impression->id;
		$markedImpression->save();

		return $impression;
	}

	public function unmarkImpression($user, $impression)
	{
		$impression = Impression::where('ref', '=', $impression->ref)->first();
		$markedImpression = MarkedImpression::where([
			['user_id', '=', $user->id],
			['impression_id', '=', $impression->id],
		])->first();

		if (empty($markedImpression)) {
			return false;
		}

		$markedImpression->delete();
		return true;
	}

	public function getMarkedImpression($user, $impression)
	{
		return MarkedImpression::where([
			['user_id', '=', $user->id],
			['impression_id', '=', $impression->id],
		])->first();
	}

	public function getMarkedImpressions($user)
	{
		return MarkedImpression::with('impression:id,ref')
			->where('user_id', '=', $user->id)
			->orderBy('id', 'desc')
			->get()
			->pluck('impression.ref');
	}

	public function getUsersThatMarkedImpression($impression)
	{
		return MarkedImpression::with('user:id,ref')
			->where('impression_id', '=', $impression->id)
			->orderBy('id', 'desc')
			->get()
			->pluck('user.ref');
	}

	public function getAggregatedData($origin, $params)
	{
		try {
			// Strip outer fkey wrapper
			$params = $params['fkey'];

			// Build Additional Queries
			$whereBuilder = null;

			if (isset($params['event_key']) && !empty($params['event_key'])) {
				$whereBuilder = ' AND f.event_key = :event_key';
			}

			if (isset($params['client_key']) && !empty($params['client_key'])) {
				$whereBuilder .= ' AND f.client_key = :client_key';
			}

			if (isset($params['producer_key']) && !empty($params['producer_key'])) {
				$whereBuilder .= ' AND f.producer_key = :producer_key';
			}

			// Fetch Data
			$rawAggregatedImpressions = $this->getAggregatedImpressions($params, $whereBuilder);
			$rawAggregatedNotes = $this->getAggregatedNotes($params, $whereBuilder);

			return $this->prepareAggregatedData($rawAggregatedImpressions, $rawAggregatedNotes);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	protected function getAggregatedImpressions($params, $whereBuilder)
	{
		$rawData = DB::select(
			"SELECT 
				COUNT(i.ref) as impression_total,
				MIN(i.created_at) as impression_first,
				MAX(i.created_at) as impression_last,

				COALESCE(AVG(r.final_points),0) as final_points_avg,
				COALESCE(MIN(r.final_points),0) as final_points_min,
				COALESCE(MAX(r.final_points),0) as final_points_max,

				COALESCE(AVG(r.balance),0) as balance_avg,
				COALESCE(MIN(r.balance),0) as balance_min,
				COALESCE(MAX(r.balance),0) as balance_max,

				COALESCE(AVG(r.length),0) as length_avg,
				COALESCE(MIN(r.length),0) as length_min,
				COALESCE(MAX(r.length),0) as length_max,

				COALESCE(AVG(r.intensity),0) as intensity_avg,
				COALESCE(MIN(r.intensity),0) as intensity_min,
				COALESCE(MAX(r.intensity),0) as intensity_max,

				COALESCE(AVG(r.terroir),0) as terroir_avg,
				COALESCE(MIN(r.terroir),0) as terroir_min,
				COALESCE(MAX(r.terroir),0) as terroir_max,

				COALESCE(AVG(r.complexity),0) as complexity_avg,
				COALESCE(MIN(r.complexity),0) as complexity_min,
				COALESCE(MAX(r.complexity),0) as complexity_max
			FROM " .
				DB_PREFIX .
				"impression i
			JOIN " .
				DB_PREFIX .
				"fkey f 
			ON 
				i.fkey_id = f.id
			JOIN " .
				DB_PREFIX .
				"rating r 
			ON 
				r.impression_id = i.id
			WHERE
				i.fkey_id IS NOT NULL
			AND
				i.deleted_at IS NULL
			AND
				f.origin = :origin
			AND
				f.subject_key = :subject_key" .
				$whereBuilder,
			$params
		);

		return $rawData[0];
	}

	protected function getAggregatedNotes($params, $whereBuilder)
	{
		$rawData = DB::select(
			"SELECT 
				flags.key as notekey,
				COUNT(flags.key) as notecount
			FROM " .
				DB_PREFIX .
				"impression i
			JOIN " .
				DB_PREFIX .
				"fkey f 
			ON 
				i.fkey_id = f.id
			JOIN " .
				DB_PREFIX .
				"rating r 
			ON 
				r.impression_id = i.id
			JOIN (
				SELECT 
					n_i.impression_id,
					n.key
				FROM " .
				DB_PREFIX .
				"impression_note as n_i
				JOIN " .
				DB_PREFIX .
				"note as n 
				ON 
					n_i.note_id = n.id
			) flags ON flags.impression_id = i.id 
			WHERE
				i.deleted_at IS NULL
			AND
				i.fkey_id IS NOT NULL
			AND
				f.origin = :origin
			AND
				f.subject_key = :subject_key
			" .
				$whereBuilder .
				"
			GROUP BY
				flags.key
			",
			$params
		);

		return $rawData;
	}

	protected function prepareAggregatedData($impData, $noteData)
	{
		// Prepare Notes
		$flags = [];

		foreach ($noteData as $note) {
			$noteKeyParts = explode('_', trim($note->notekey, '_'), 2);
			$noteKeyParts[1] = $noteKeyParts[1] ?? $noteKeyParts[0];

			$flags[$noteKeyParts[0]] = $flags[$noteKeyParts[0]] ?? [];
			$flags[$noteKeyParts[0]][$noteKeyParts[1]] = $note->notecount;
		}

		// General Format
		$formattedData = [
			'impressions' => [
				'total' => $impData->impression_total,
				'first' => $impData->impression_first,
				'last' => $impData->impression_last,
			],
			'rating_stats' => [
				'parker_val' => [
					'avg' => Commons::ParseRating($impData->final_points_avg),
					'min' => Commons::ParseRating($impData->final_points_min),
					'max' => Commons::ParseRating($impData->final_points_max),
				],
				'balance' => [
					'avg' => Commons::ParseRating($impData->balance_avg),
					'min' => Commons::ParseRating($impData->balance_min),
					'max' => Commons::ParseRating($impData->balance_max),
				],
				'length' => [
					'avg' => Commons::ParseRating($impData->length_avg),
					'min' => Commons::ParseRating($impData->length_min),
					'max' => Commons::ParseRating($impData->length_max),
				],
				'intensity' => [
					'avg' => Commons::ParseRating($impData->intensity_avg),
					'min' => Commons::ParseRating($impData->intensity_min),
					'max' => Commons::ParseRating($impData->intensity_max),
				],
				'terroir' => [
					'avg' => Commons::ParseRating($impData->terroir_avg),
					'min' => Commons::ParseRating($impData->terroir_min),
					'max' => Commons::ParseRating($impData->terroir_max),
				],
				'complexity' => [
					'avg' => Commons::ParseRating($impData->complexity_avg),
					'min' => Commons::ParseRating($impData->complexity_min),
					'max' => Commons::ParseRating($impData->complexity_max),
				],
			],
			'flags' => $flags,
		];

		return $formattedData;
	}

	protected function createImpression($payload)
	{
		$user = Auth::user();
		$impression = new Impression();
		$impression->ref = StringHelper::readableRefGenerator(
			$this->refLength,
			'impression',
			'ref'
		);
		$impression->lifecycle_id = 0;
		$impression->origin_id = 0;
		$impression->owner_ref = $user->ref;
		$impression->impression_type_id = 0;
		$impression->mold = array_get($payload, 'mold', null);
		$team = $this->teamService->getTeamByMoldAndMember($impression->mold, $user);
		$impression->team_id = !empty($team) ? $team->id : null;
		$impression->metadata = Commons::convertJsonStringOrObject($payload);
		$subject = $impression->saveSubject($payload);
		$impression->saveOrigin(Commons::getProperty($payload, 'source'));
		$impression->saveOriginCollection(Commons::getProperty($payload, 'collection'));
		$impression->subject_id = $subject->id;
		$impression->save();
		return $impression;
	}

	protected function updateImpression($payload)
	{
		$this->impression->mold = array_get($payload, 'mold', null);
		$this->impression->metadata = Commons::convertJsonStringOrObject($payload);
		$this->impression->saveOrigin(Commons::getProperty($payload, 'source'), true);
		$subject = $this->impression->saveSubject($payload, true);
		$this->impression->saveIndividual($payload, true);
		$this->impression->saveStats(Commons::getProperty($payload, 'stats', []));
		$this->impression->saveRating(Commons::getProperty($payload, 'rating'));
		$this->impression->saveImpressionInfo(Commons::getProperty($payload, 'info'));
		if (isset($payload['notes'])) {
			$this->impression->saveImpressionNotes(Commons::getProperty($payload, 'notes'));
		}
		$this->impression->subject_id = $subject->id;
		$this->impression->save();
		return $this->impression;
	}

	protected function deleteImpressions($impressions)
	{
		$this->deleteEntitiesWithRef(Impression::class, $impressions);
	}

	protected function addImpressionData($payload)
	{
		// Do one final check before saving child entities
		if (empty($this->impression->id)) {
			$this->fail(
				'Impression ID missing',
				$this->errorCodes['exists'],
				'impression',
				__FILE__,
				__LINE__,
				[
					'impression' => $this->impression,
					'payload' => $payload,
				]
			);
		}

		// Save child entities
		$this->impression->saveIndividual($payload);
		$this->impression->saveStats(Commons::getProperty($payload, 'stats', []));
		$this->impression->saveRating(Commons::getProperty($payload, 'rating'));
		$this->impression->saveImpressionNotes(Commons::getProperty($payload, 'notes'));
		$this->impression->saveImpressionInfo(Commons::getProperty($payload, 'info'));
		$this->impression->saveImpressionFkey(Commons::convertJsonStringOrObject($payload, 'fkey'));
	}

	protected function getImpressionByRef($ref)
	{
		$user = Auth::user();
		$impression = Impression::getByImpressionAndOwnerRef($ref, $user->ref);

		if (empty($impression)) {
			$this->fail(
				'Impression not found',
				$this->errorCodes['exists'],
				'ref',
				__FILE__,
				__LINE__,
				['ref' => $ref]
			);
		}

		return $impression;
	}

	public function getImpressionByRefWithoutOwnerRestriction($ref)
	{
		return Impression::where('ref', '=', $ref)->first();
	}

	protected function saveImpressionFile($fileInfo, $impressionId, $refLength)
	{
		$file = FileHelper::saveFile($fileInfo, $this->refLength);
		$impressionFile = new ImpressionFile();
		$impressionFile->file_id = $file->id;
		$impressionFile->impression_id = $impressionId;
		$impressionFile->save();

		return $file;
	}

	private function getRawImpressionDataByRef($ref)
	{
		$this->devAccessOnly();
		$impression = $this->getImpressionByRef($ref);
		return $this->impressionService->buildImpressionData($impression, true);
	}

	protected function validateImpressionRef($ref)
	{
		if (empty($ref)) {
			$this->fail(
				'Reference missing',
				$this->errorCodes['valid_ref'],
				'ref',
				__FILE__,
				__LINE__,
				[]
			);
		}

		$impressionRefValidator = Validator::make(
			['ref' => $ref],
			['ref' => 'valid_ref|exists:impression,ref,deleted_at,NULL'],
			$this->ruleMessages
		);
		$this->checkValidatorForErrors($impressionRefValidator);
	}

	protected function validateOwnerRef()
	{
		$user = Auth::user();

		if ($this->impression->owner_ref != $user->ref) {
			$this->fail(
				'Impression does not belong to user',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'ownerRef' => $this->impression->owner_ref,
					'userRef' => $user->ref,
				]
			);
		}
	}

	protected function validateDeleteImpressionPayload($inputRefs, $impressions, $user)
	{
		// Check for Existence
		$impressionRefs = $impressions->pluck('ref')->toArray();
		ValidationHelper::checkForNonExistingKeysOrRefs($inputRefs, $impressionRefs, 'impressions');

		// Check for Ownership
		foreach ($impressions as $impression) {
			ValidationHelper::validateEntityOwnership($impression, $user);
		}

		// Check if Impression is part of an Event
		$impressionIds = $impressions->pluck('id')->toArray();
		$collectionImpressions = CollectionImpression::whereIn('impression_id', $impressionIds)
			->get()
			->pluck('impression_id')
			->toArray();

		if (!empty($collectionImpressions)) {
			// Get Impression Refs without querying
			$impressionsWithRelationRefs = $impressions
				->whereIn('id', $collectionImpressions)
				->pluck('ref')
				->toArray();

			$this->fail(
				'The wine_ref(s) [' .
					implode(',', $impressionsWithRelationRefs) .
					'] has a relation to an event.',
				$this->errorCodes['impression_on_collection'],
				'wine_refs',
				__FILE__,
				__LINE__,
				[
					'wine_refs' => $impressionsWithRelationRefs,
				]
			);
		}
	}
}
