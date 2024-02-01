<?php
namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Arr;
use App\Models\Collection;
use App\Models\CollectionType;
use App\Models\CollectionFeatured;
use App\Models\CollectionImpression;
use App\Models\Team;
use App\Models\Impression;
use App\Models\ImpressionNote;
use App\Models\ImpressionFile;
use App\Models\Rating;
use App\Models\File;
use App\Models\Note;
use App\Helpers\StringHelper;
use App\Helpers\FileHelper;
use App\Helpers\ValidationHelper;
use App\Helpers\Commons;
use App\Services\ImpressionService;
use App\Services\ContestService;
use App\Services\TeamService;

class EventController extends CollectionController
{
	const MODEL = 'App\Models\Collection';

	private $host = null;
	private $team = null;
	private $events = null;
	private $errorType = 'event';
	private $errorMessage = '';
	private $errorKey = '';
	private $errorField = '';

	public function __construct()
	{
		parent::__construct();
		$this->refLength = config('app.impression.refLength');
		$this->refMaxLength = config('app.identity.refMaxLength');
		$this->avatarPayloadKey = 'avatar';
		$this->wineImportPayloadKey = 'uploadedFile';
		$this->impressionService = new ImpressionService();
		$this->contestService = new ContestService();
		$this->teamService = new TeamService();
	}

	public function add(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$this->validateEventPayload($payload);

			// Include the profile pic in the $payload var if it exists in the request
			$payload = $this->setFilePayloadKey($request, $payload, $this->avatarPayloadKey);

			$event = $this->createEvent($payload);
			return $this->success(
				'Event created!',
				Response::HTTP_CREATED,
				$this->buildEventData($event)
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getPublicEvents()
	{
		try {
			$currentUser = Auth::user();
			return $this->getPublicCollections($currentUser);
		} catch (Exception $e) {
			return $this->error($e);
		}
	}

	public function getOwnEvents()
	{
		try {
			$currentUser = Auth::user();
			return $this->getUserEvents($currentUser->ref);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getPublicEventsByUserRef($userRef)
	{
		try {
			$currentUser = Auth::user();
			ValidationHelper::validateEntityExists($userRef, 'user', 'ref');
			return $this->getUserCollections($userRef);
		} catch (Exception $e) {
			return $this->error($e);
		}
	}

	public function getFeaturedEvents()
	{
		try {
			$currentUser = Auth::user();
			$featuredEvents = $this->getUserFeaturedCollections();
			$featuredUserContests = $this->contestService->getFeaturedUserContests(
				$currentUser->ref
			);
			return [
				'events' => $featuredEvents,
				'contests' => $featuredUserContests,
			];
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addFeaturedEvents(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$this->validateFeaturedEventsPayload($payload);

			return $this->success(
				'Event(s) are now featured!',
				Response::HTTP_CREATED,
				$this->addUserFeaturedCollections($payload)
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function deleteFeaturedEvents(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$this->validateDeleteFeaturedEventsPayload($payload);

			return $this->success(
				'Event(s) removed from being featured!',
				Response::HTTP_ACCEPTED,
				[
					'event_refs' => $this->deleteUserFeaturedCollections($payload),
				]
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getByRef($ref)
	{
		try {
			$currentUser = Auth::user();
			$event = $this->getCollection($ref);
			$this->validateEventAccess($currentUser->ref, $event);
			return $this->buildEventData($event);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function exportTeacher($ref)
	{
		try {
			$currentUser = Auth::user();
			return $this->getTeacherData($ref);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function updateByRef($ref, Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$this->validateEventPayload($payload);

			// Include the profile pic in the $payload var if it exists in the request
			$payload = $this->setFilePayloadKey($request, $payload, $this->avatarPayloadKey);

			$event = $this->updateEvent($ref, $payload);
			return $this->success(
				'Event updated!',
				Response::HTTP_OK,
				$this->buildEventData($event)
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
			$this->validateDeleteEventPayload($payload, $currentUser);
			$this->deleteCollections($this->events);

			return $this->success('Event(s) deleted!', Response::HTTP_ACCEPTED, [
				'event_refs' => $this->events->pluck('ref'),
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function deleteWines($ref, Request $request)
	{
		try {
			if (!$request->has('wine_refs') || count($request['wine_refs']) <= 0) {
				$this->fail(
					'Payload empty or invalid',
					'wine_refs',
					$this->errorCodes['invalid_payload'],
					__FILE__,
					__LINE__
				);
			}

			$currentUser = Auth::user();
			$payload = Commons::prepareData($request->post());
			$event = $this->getCollection($ref);
			$results = $this->deleteEventWines($event, $currentUser, $payload);

			return $this->success('Wines removed!', Response::HTTP_ACCEPTED, $results);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function importData($ref, Request $request)
	{
		try {
			$this->validateEventImportData($ref);
			$filePayload = $request->file($this->wineImportPayloadKey);
			$importedEventData = $this->importCollectionData($ref, $filePayload);

			return $this->success(
				'Event data imported!',
				Response::HTTP_OK,
				$this->buildEventData($importedEventData)
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	private function validateEventImportData($ref)
	{
		ValidationHelper::validateEntityExists($ref, 'collection', 'ref');
		ValidationHelper::validateJsonFile($this->wineImportPayloadKey);
	}

	private function buildEventData($event)
	{
		$eventData = $this->buildCollectionData($event);
		$eventData['tastings'] = $eventData['impressions'];
		unset($eventData['impressions']);

		if (!empty($eventData['stats'])) {
			$eventStats = [
				'eventCreatedTastings' => $eventData['stats']['collectionCreatedImpressions'],
				'eventTastings' => $eventData['stats']['collectionImpressions'],
				'average_rating' => $eventData['stats']['average_rating'],
			];

			unset($eventData['stats']);
			$eventData['stats'] = $eventStats;
		}

		return $eventData;
	}

	private function buildExportTeacherData($rawTeacherData)
	{
		$rawTeacherData['tastings'] = $this->extractTastings($rawTeacherData->impressions);
		return $this->sanitizeTeacherData($rawTeacherData);
	}

	private function sanitizeTeacherData($rawTeacherData)
	{
		$rawTeacherData->makeHidden('id');
		$rawTeacherData->makeHidden('ref');
		$rawTeacherData->makeHidden('collection_type_id');
		$rawTeacherData->makeHidden('collection_access_type_id');
		$rawTeacherData->makeHidden('updated_at');
		$rawTeacherData->makeHidden('owner_ref');
		$rawTeacherData->makeHidden('impressions');
		$rawTeacherData->makeHidden('deleted_at');
		$rawTeacherData->makeHidden('metadata');
		$rawTeacherData->impressions->makeHidden('id');
		$rawTeacherData->impressions->makeHidden('origin_id');
		$rawTeacherData->impressions->makeHidden('lifecycle_id');
		$rawTeacherData->impressions->makeHidden('impression_type_id');
		$rawTeacherData->impressions->makeHidden('owner_ref');
		$rawTeacherData->impressions->makeHidden('deleted_at');
		$rawTeacherData->impressions->makeHidden('collection_id');
		$rawTeacherData->impressions->makeHidden('impressionNotes');
		$rawTeacherData->impressions->makeHidden('owner');
		$rawTeacherData->impressions->makeHidden('origin');
		$rawTeacherData->impressions->makeHidden('source');

		return $rawTeacherData;
	}

	private function extractTastings($impressions)
	{
		$impressionsByUserRef = $this->groupEventTastingsByOwnerRef($impressions);

		if (!empty($impressionsByUserRef)) {
			foreach ($impressionsByUserRef as $impressions) {
				if (!empty($impressions)) {
					$impressionNotes = Arr::pluck($impressions->toArray(), 'impression_notes');
					foreach ($impressions as $impression) {
						$impression['notes'] = $this->extractNotes($impressionNotes);
						$impression['user'] = $this->extractOwnerData($impression->owner);
						$impression['source'] = $this->extractOrigin($impression->origin);
						$impression['rating'] = $this->extractRating($impression->rating);
					}
				}
			}
		}

		return $impressionsByUserRef;
	}

	protected function extractOwnerData($owner)
	{
		if (empty($owner)) {
			return null;
		}

		return [
			'ref' => $owner->ref,
			'handle' => $owner->handle,
			'email' => $owner->identity->email,
			'name' => $owner->name,
		];
	}

	protected function extractOrigin($origin)
	{
		if (empty($origin)) {
			return null;
		}

		return $origin->client . ':' . $origin->version;
	}

	protected function extractRating($rating)
	{
		if (empty($rating)) {
			return null;
		}

		$rating->makeHidden('id');
		$rating->makeHidden('impression_id');
		return $rating;
	}

	protected function extractNotes($impressionNotes)
	{
		// Init rating data
		$notes = [];

		// Build, organize and convert required rating data
		if (!empty($impressionNotes)) {
			foreach ($impressionNotes as $impressionNote) {
				foreach ($impressionNote as $note) {
					$notes[$note['type']][] = $note['note']['key'];
				}
			}
		}

		return $notes;
	}

	private function groupEventTastingsByOwnerRef($impressions)
	{
		return $impressions->groupBy('owner_ref');
	}

	private function createEvent($payload)
	{
		$currentUser = Auth::user();
		$event = $this->createCollection($payload, 'event');
		$this->saveEventWines($event, $currentUser, $payload);

		if (!empty($this->hostTeamRef) && !empty($this->hostTeam)) {
			$event['host'] = $this->saveCollectionHost($event, $this->hostTeam);
		}

		return $event;
	}

	private function updateEvent($ref, $payload)
	{
		$currentUser = Auth::user();
		$event = $this->updateCollection($ref, $payload, 'event');
		$this->saveEventWines($event, $currentUser, $payload);

		if (!empty($this->hostTeamRef) && !empty($this->hostTeam)) {
			$event['host'] = $this->saveCollectionHost($event, $this->hostTeam);
		}

		return $event;
	}

	private function saveEventWines($event, $user, $payload)
	{
		$wineRefs = Commons::getProperty($payload, 'wine_refs') ?: [];

		if (empty($wineRefs) && !is_array($wineRefs)) {
			$this->fail('Payload empty or invalid', __FILE__, __LINE__);
		}

		$winesAdded = $this->saveCollectionImpressions($event, $user, $wineRefs);
	}

	private function getUserEvents($userRef)
	{
		$events = $this->getUserCollections($userRef, true);

		foreach ($events as $event) {
			$event['wines'] = $this->getImpressionRefs($event);
		}

		return $events;
	}

	private function deleteEventWines($event, $user, $payload)
	{
		$wineRefs = Commons::getProperty($payload, 'wine_refs') ?: [];

		if (empty($wineRefs) && !is_array($wineRefs)) {
			$this->fail('Payload empty or invalid', __FILE__, __LINE__);
		}

		$deletedWines = $this->deleteCollectionImpressions($event, $user, $wineRefs);

		return [
			'eventRef' => $event->ref,
			'userRef' => $user->ref,
			'deletedWines' => $deletedWines,
		];
	}

	private function getEventTastings($event)
	{
		$tastings = CollectionImpression::with(
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
				'collection_id' => $event->id,
			])
			->has('impression')
			->get()
			->pluck('impression');

		$eventTastings = $tastings->map(function ($impression) {
			return $this->impressionService->buildImpressionData($impression);
		});

		return $eventTastings;
	}

	protected function validateFeaturedEventsPayload($payload)
	{
		ValidationHelper::validatePayload($payload);

		$featuredEvents = Commons::getProperty($payload, 'featured_events');

		if (!is_array($featuredEvents)) {
			$this->fail(
				'Payload empty or invalid',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'payload' => $payload,
				]
			);
		}

		foreach ($featuredEvents as $event) {
			$this->validateFeaturedEvent($event);
		}
	}

	private function validateFeaturedEvent($event)
	{
		// The event must be a multi-dimentional array (object)
		if (!is_array($event)) {
			$this->fail(
				'Payload empty or invalid',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'payload' => $payload,
				]
			);
		}

		$featuredEvent = [
			'event_ref' => Commons::getProperty($event, 'event_ref'),
			'feature_start' => Commons::getProperty($event, 'feature_start'),
			'feature_end' => Commons::getProperty($event, 'feature_end'),
		];

		$featuredEventValidator = Validator::make(
			$featuredEvent,
			CollectionFeatured::$rules,
			$this->ruleMessages
		);

		$this->checkValidatorForErrors(
			$featuredEventValidator,
			$this->errorMessage,
			$this->errorKey,
			$this->errorField
		);
	}

	protected function validateDeleteFeaturedEventsPayload($payload)
	{
		ValidationHelper::validatePayload($payload);
		$featuredEvents = Commons::getProperty($payload, 'event_refs');

		if (!is_array($featuredEvents)) {
			$this->fail(
				'Payload empty or invalid',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'payload' => $payload,
				]
			);
		}

		foreach ($featuredEvents as $event) {
			$featuredEvent = [
				'event_ref' => $event,
			];

			$featuredEventValidator = Validator::make(
				$featuredEvent,
				[
					'event_ref' =>
						'required|string|max:32|valid_ref|exists:collection,ref,deleted_at,NULL',
				],
				$this->ruleMessages
			);

			$this->checkValidatorForErrors(
				$featuredEventValidator,
				$this->errorMessage,
				$this->errorKey,
				$this->errorField
			);
		}
	}

	protected function validateEventPayload($payload)
	{
		$visibility = Commons::getProperty($payload, 'visibility');
		$this->hostTeamRef = Commons::getProperty($payload, 'host');

		$this->validateCollectionVisibility($visibility);
		$this->validateCollectionPayload($payload);

		if (!empty($this->hostTeamRef)) {
			$this->hostTeam = $this->findTeamByRef($this->hostTeamRef);
			$this->validateCollectionHost($this->hostTeam);
		}
	}

	protected function validateDeleteEventPayload($payload, $user)
	{
		ValidationHelper::validatePayload($payload);
		$eventRefs = Commons::getProperty($payload, 'event_refs') ?: [];

		if (empty($eventRefs) && !is_array($eventRefs)) {
			$this->fail(
				'Payload empty or invalid',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'payload' => $payload,
				]
			);
		}

		foreach ($eventRefs as $eventRef) {
			ValidationHelper::validateEntityExists($eventRef, 'collection', 'ref');
		}

		$collectionType = CollectionType::where('key', 'event')->first();
		$this->events = Collection::whereIn('ref', $eventRefs)
			->where('collection_type_id', '=', $collectionType->id)
			->get();

		$this->validateDeleteCollectionPayload($this->events, $user);
	}

	protected function validateEventAccess($currentUserRef, $event)
	{
		if ($currentUserRef === $event->owner_ref) {
			return;
		}

		if ($event->visibility == 'private') {
			$this->fail(
				'Invalid event access',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'currentUser' => $currentUserRef,
					'event' => $event->ref,
				]
			);
		}
	}

	protected function findTeamByRef($ref)
	{
		ValidationHelper::validateTeamExists($ref, 'team', 'ref');
		$team = Team::where('ref', '=', $ref)->first();
		return $team;
	}
}
