<?php
namespace App\Http\Controllers;

use Carbon\Carbon;
use HJSON\HJSONParser;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Team;
use App\Models\Impression;
use App\Models\Collection;
use App\Models\CollectionFeatured;
use App\Models\CollectionType;
use App\Models\CollectionAccessType;
use App\Models\TeamCollection;
use App\Models\CollectionImpression;
use App\Models\TeamUser;
use App\Helpers\StringHelper;
use App\Helpers\ValidationHelper;
use App\Helpers\FileHelper;
use App\Helpers\Commons;
use App\Services\ImpressionService;
use App\Services\ContestService;
use App\Services\TeamService;
use App\Services\CollectionService;

class CollectionController extends Controller
{
	const MODEL = 'App\Models\Collection';

	public function __construct()
	{
		parent::__construct();
		$this->refLength = config('app.impression.refLength');
		$this->refMaxLength = config('app.identity.refMaxLength');
		$this->sanitizeFields = [
			'id',
			'collection_type_id',
			'collection_access_type_id',
			'collection_type_id_subtype',
		];
		$this->impressionService = new ImpressionService();
		$this->contestService = new ContestService();
		$this->teamService = new TeamService();
		$this->collectionService = new collectionService();
	}

	protected function updateCollection($ref, $payload, $collectionTypeRef)
	{
		$currentUser = Auth::user();
		$collection = $this->getCollection($ref);
		$this->validateEditCollectionPrivilege($collection, $currentUser);
		$this->saveCollectionPayload($collection, $payload);
		return $collection;
	}

	protected function getCollection($ref)
	{
		ValidationHelper::validateEntityExists($ref, 'collection', 'ref');
		$collection = Collection::where('collection.ref', '=', $ref)
			->select(
				'collection.*',
				'collection_access_type.key as visibility',
				'collection_type.key as sub_type'
			)
			->join(
				'collection_access_type',
				'collection_access_type.id',
				'collection.collection_access_type_id'
			)
			->join('collection_type', 'collection_type.id', 'collection.collection_type_id_subtype')
			->whereNull('collection.deleted_at')
			->first()
			->makeHidden($this->sanitizeFields);

		$owner = User::where('ref', '=', $collection->owner_ref)->first();
		if (empty($owner)) {
			$this->fail(
				'Collection not found',
				$this->errorCodes['exists'],
				'ref',
				__FILE__,
				__LINE__,
				['ref' => $ref]
			);
		}

		return $collection;
	}

	protected function getTeacherData($ref)
	{
		$devRefs = implode("','", config('app.devRefs'));
		$devRefs = strtolower("'{$devRefs}'");

		$results = DB::select(
			"
			SELECT 
			id.email, 
			u.name ,
			i.created_at as created,
			s.name as wine,
			metadata,     
			r.final_points, 
			r.balance,
			r.length  ,
			r.intensity,
			r.terroir, 
			r.complexity, 
			keynotes,
			ind.summary_wine,
			ind.summary_personal,
			ind.drinkability_legacy as drinkability, 
			ind.maturity_legacy as maturity, 
			ind.location,
			i.id as impression_id, 
			owner_ref

			from " .
				DB_PREFIX .
				"impression i 
			JOIN " .
				DB_PREFIX .
				"user u ON i.owner_ref = u.ref
			JOIN " .
				DB_PREFIX .
				"identity id ON u.id = id.user_id
			JOIN " .
				DB_PREFIX .
				"rating r ON r.impression_id = i.id
			JOIN " .
				DB_PREFIX .
				"individual ind ON ind.impression_id = i.id
			JOIN " .
				DB_PREFIX .
				"subject s ON s.id = i.subject_id

			join (SELECT impression_id, GROUP_CONCAT(n.key) as keynotes
			FROM " .
				DB_PREFIX .
				'impression_note i_n join ' .
				DB_PREFIX .
				"note n on i_n.note_id = n.id
			group by impression_id) notes ON notes.impression_id = i.id

			WHERE u.ref NOT IN ({$devRefs}) 			
			AND i.deleted_at = NULL

			ORDER BY email, impression_id
		"
		);

		return $results;
	}

	protected function createCollection($payload, $collectionTypeRef)
	{
		$collectionType = CollectionType::where('key', $collectionTypeRef)->first();
		$currentUser = Auth::user();
		$collection = new Collection();
		$collection->ref = StringHelper::readableRefGenerator(
			$this->refLength,
			'collection',
			'ref'
		);
		$collection->owner_ref = $currentUser->ref;
		$collection->collection_type_id = $collectionType->id;
		$this->saveCollectionPayload($collection, $payload);
		return $collection;
	}

	protected function buildCollectionData($collection)
	{
		$currentUser = Auth::user();
		$collectionData = $collection;

		$impressions = $this->getCollectionImpressions($collection);
		$collectionData['impressions'] = $impressions;
		$hasEditPrivilege = $this->getEditCollectionPrivilege($collection, $currentUser);

		if ($hasEditPrivilege) {
			$collectionData['stats'] = $this->getCollectionStats($collection, $impressions);
		}

		return $collectionData;
	}

	protected function getCollectionImpressions($collection)
	{
		$currentUser = Auth::user();
		$impressions = CollectionImpression::with(
			'impression',
			'impression.origin',
			'impression.subject',
			'impression.individual',
			'impression.rating',
			'impression.team',
			'impression.collection',
			'impression.infos',
			'impression.impressionNotes.note',
			'impression.impressionFiles.file'
		)
			->where([
				'collection_id' => $collection->id,
			])
			->get()
			->pluck('impression');

		$collectionImpressions = $impressions->map(function ($impression) use (
			$collection,
			$currentUser
		) {
			$moldImpressions = $this->collectionService
				->getMoldImpressions($impression->ref)
				->where('collection_id', empty($collection) ? null : $collection->id)
				->where('owner_ref', empty($currentUser) ? null : $currentUser->ref)
				->count();

			$impression = $this->impressionService->buildImpressionData($impression);
			$impression['existing_user_impression'] = $moldImpressions > 0;

			return $impression;
		});

		return $collectionImpressions;
	}

	protected function getImpressionRefs($collection)
	{
		try {
			$impressions = CollectionImpression::where('collection_id', '=', $collection->id)
				->select('impression_id')
				->groupBy('impression_id')
				->get();
			$collectionImpressions = Impression::whereIn('id', $impressions)->pluck('ref');
			return $collectionImpressions;
		} catch (Exception $e) {
			return $this->error($e);
		}
	}

	protected function saveCollectionPayload($collection, $payload)
	{
		$collection->name = Commons::getProperty($payload, 'name');
		$collection->description = Commons::getProperty($payload, 'description');
		$collection->start_date = Commons::getProperty($payload, 'start_date');
		$collection->end_date = Commons::getProperty($payload, 'end_date');
		$collection->metadata = Commons::convertJsonStringOrObject($payload);

		// Add access_type
		$visibility = Commons::getProperty($payload, 'visibility') ?: 'unlisted';
		$access_type = CollectionAccessType::where('key', strtolower($visibility))->first();
		$collection->collection_access_type_id = $access_type->id;
		// Profile Pic
		$collection = $this->processAvatar($collection, $payload);
		// Sub Type
		$subTypeRef = Commons::getProperty($payload, 'sub_type') ?: 'unknown';
		$subType = CollectionType::where('key', $subTypeRef)->first();
		$collection->collection_type_id_subtype = $subType->id;
		// Save
		$collection->save();

		// Sanitize
		$collection->makeHidden($this->sanitizeFields);
		$collection['visibility'] = $access_type->key;
		$collection['sub_type'] = $subTypeRef;
	}

	protected function getUserFeaturedCollections()
	{
		$featuredCollections = CollectionFeatured::with('collection')
			->where([['feature_start', '<=', Carbon::now()], ['feature_end', '>=', Carbon::now()]])
			->has('collection')
			->orderBy('feature_start')
			->groupBy('collection_id')
			->get()
			->makeHidden(['id', 'collection_id']);

		foreach ($featuredCollections as $featuredCollection) {
			// makeHidden can't be directly called in relationships
			$featuredCollection->collection->makeHidden([
				'id',
				'collection_type_id',
				'collection_access_type_id',
			]);
		}

		return $featuredCollections;
	}

	protected function addUserFeaturedCollections($payload)
	{
		$featuredCollections = Commons::getProperty($payload, 'featured_events');
		$savedCollectionFeatured = $this->saveCollectionFeaturedObjects($featuredCollections);
		return $savedCollectionFeatured;
	}

	private function saveCollectionFeaturedObjects($featuredCollections)
	{
		$collectionFeaturedObjects = [];

		if (empty($featuredCollections)) {
			return $collectionFeaturedObjects;
		}

		$featuredCollectionRefs = array_column($featuredCollections, 'event_ref');

		// todo: refactor and apply eager loading
		foreach ($featuredCollections as $featuredCollection) {
			$collection = Collection::where('ref', '=', $featuredCollection['event_ref'])
				->whereNull('deleted_at')
				->first();
			$collectionFeatured = CollectionFeatured::where(
				'collection_id',
				'=',
				$collection->id
			)->first();

			if (empty($collectionFeatured)) {
				$collectionFeatured = new CollectionFeatured();
			}

			$collectionFeatured->collection_id = $collection->id;
			$collectionFeatured->feature_start = $featuredCollection['feature_start'];
			$collectionFeatured->feature_end = $featuredCollection['feature_end'];
			$collectionFeatured->save();
			$collectionFeatured->collection = $collection;
			$collectionFeatured->makeHidden(['id', 'user_id', 'collection_id']);
			$collectionFeatured->collection->makeHidden([
				'id',
				'collection_type_id',
				'collection_access_type_id',
			]);

			$collectionFeaturedObjects[] = $collectionFeatured;
		}

		return $collectionFeaturedObjects;
	}

	protected function deleteUserFeaturedCollections($payload)
	{
		$featuredCollections = Commons::getProperty($payload, 'event_refs');
		$deletedFeaturedCollections = $this->deleteCollectionFeaturedObjects($featuredCollections);
		return $deletedFeaturedCollections;
	}

	private function deleteCollectionFeaturedObjects($featuredCollections)
	{
		$collectionFeaturedObjects = [];

		if (empty($featuredCollections)) {
			return $collectionFeaturedObjects;
		}

		foreach ($featuredCollections as $featuredCollection) {
			$collection = Collection::where('ref', '=', $featuredCollection)->first();

			$collectionFeatured = CollectionFeatured::where(
				'collection_id',
				'=',
				$collection->id
			)->first();

			if (empty($collectionFeatured)) {
				$this->fail(
					'Collection is currently not being featured.',
					$this->errorCodes['invalid_entity_access'],
					'',
					__FILE__,
					__LINE__,
					[
						'collection' => $collection,
					]
				);
			}

			$collectionFeatured->delete();
			$collectionFeaturedObjects[] = $collection->ref;
		}

		return $collectionFeaturedObjects;
	}

	protected function saveCollectionHost($collection, $hostTeam)
	{
		$teamCollection = TeamCollection::where('collection_id', '=', $collection->id)
			->whereNull('deleted_at')
			->first();

		if (empty($teamCollection)) {
			$teamCollection = new TeamCollection();
		}

		$teamCollection->collection_id = $collection->id;
		$teamCollection->team_id = $hostTeam->id;
		$teamCollection->type = 'host';
		$teamCollection->save();

		return $hostTeam->ref;
	}

	protected function saveCollectionImpressions($collection, $user, $impressionRefs)
	{
		$impressions = Impression::whereIn('ref', $impressionRefs)
			->whereNull('deleted_at')
			->get();
		$impressionsAdded = [];

		// Validate and Save Impressions
		foreach ($impressions as $impression) {
			$this->validateEditImpressionPrivilege($impression, $user);
			$collectionImpression = CollectionImpression::firstOrCreate([
				'collection_id' => $collection->id,
				'impression_id' => $impression->id,
			]);

			array_push($impressionsAdded, $impression->ref);
		}

		return $impressionsAdded;
	}

	protected function deleteCollections($collections)
	{
		$this->deleteEntitiesWithRef(Collection::class, $collections);
	}

	protected function deleteCollectionImpressions($collection, $user, $impressionRefs)
	{
		$impressions = Impression::whereIn('ref', $impressionRefs)
			->whereNull('deleted_at')
			->get();
		$ImpressionsDeleted = [];

		foreach ($impressions as $impression) {
			$this->validateEditImpressionPrivilege($impression, $user);
			if (
				CollectionImpression::where([
					'collection_id' => $collection->id,
					'impression_id' => $impression->id,
				])->delete()
			) {
				array_push($ImpressionsDeleted, $impression->ref);
			}
		}

		return $ImpressionsDeleted;
	}

	protected function validateCollectionPayload($payload)
	{
		ValidationHelper::validatePayload($payload);

		$rules = Collection::$rules;
		unset($rules['ref']);

		$this->validateCollection($payload, $rules);
	}

	protected function validateCollection($payload, $rules = null)
	{
		if (empty($rules)) {
			$rules = Collection::$rules;
		}

		// Validate Collection fields
		$collectionValidator = Validator::make($payload, $rules, $this->ruleMessages);
		$this->checkValidatorForErrors($collectionValidator);
	}

	protected function validateCollectionHost($hostTeam)
	{
		if (empty($hostTeam)) {
			return;
		}

		$currentUser = Auth::user();
		$userRelations = TeamUser::getCurrentUserRelations($hostTeam->id);
		$allowedRoles = ['owner', 'admin', 'editor'];
		ValidationHelper::validateTeamAuthority($userRelations, $allowedRoles);
	}

	protected function validateDeleteCollectionPayload($collections, $user)
	{
		foreach ($collections as $collection) {
			ValidationHelper::validateEntityOwnership($collection, $user);
		}
	}

	protected function findTeamByRef($ref)
	{
		ValidationHelper::validateTeamExists($ref, 'team', 'ref');
		$team = Team::where('ref', '=', $ref)
			->whereNull('deleted_at')
			->first();
		return $team;
	}

	protected function validateCollectionVisibility($visibility)
	{
		if (!empty($visibility)) {
			ValidationHelper::validateAccessType(
				$visibility,
				'collection_access_type',
				'key',
				'Invalid event visibility.'
			);
		}
	}

	protected function validateEditImpressionPrivilege($impression, $user)
	{
		$authorized = false;
		$authorized = ValidationHelper::hasRightsByOwnerRef($impression, $user);

		if (!$authorized) {
			$this->fail(
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

	protected function validateEditCollectionPrivilege($collection, $user)
	{
		$authorized = $this->getEditCollectionPrivilege($collection, $user);
		if (!$authorized) {
			$this->fail(
				'You dont have access to this collection',
				$this->errorCodes['invalid_entity_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'current_user' => $user,
					'collection' => $collection,
				]
			);
		}
	}

	protected function getPublicCollections($currentUser)
	{
		// Public Collections
		$publicCollections = Collection::where([
			['collection_access_type_id', '=', 1],
			['user.deleted_at', '=', null],
		])
			->where(function ($query) {
				$query
					->where([
						['start_date', '<=', Carbon::now()],
						['end_date', '>=', Carbon::now()],
					])
					->orWhereNull('end_date');
			})
			->whereNull('collection.deleted_at')
			->select(
				'collection.*',
				'collection_access_type.key as visibility',
				'collection_type.key as sub_type'
			)
			->join(
				'collection_access_type',
				'collection_access_type.id',
				'collection.collection_access_type_id'
			)
			->join('collection_type', 'collection_type.id', 'collection.collection_type_id_subtype')
			->join('user', 'user.ref', 'collection.owner_ref')
			->orderBy('updated_at', 'desc')
			->get()
			->makeHidden($this->sanitizeFields)
			->toArray();

		// Contest Collections
		$userContestCollections = [];
		$userContests = $this->contestService->getUserContests($currentUser);
		//$allowedRoles = ['team_leader', 'team_guide', 'team_member'];
		$excludedRoles = ['owner', 'admin', 'team_owner', 'team_admin'];

		// Check Access Rights
		foreach ($userContests as $contest) {
			$contestRelations = $this->contestService->getExpoundedRelations($contest);

			// Contest/2328
			foreach ($contestRelations as $relation) {
				if (in_array($relation, $excludedRoles)) {
					$index = array_search($relation, $contestRelations);
					unset($contestRelations[$index]);
				}
			}

			/*$contestCollections = $this->teamService->getContestCollectionsV2(
				$contest,
				$currentUser,
				$contestRelations,
				true
			);*/

			$contestCollections = $this->contestService->getContestCollectionsV4(
				$contest->ref,
				$currentUser->ref,
				true
			);

			if (!empty($contestCollections)) {
				$userContestCollections = array_merge($userContestCollections, $contestCollections);
			}
		}

		// Return user's contest collections first
		return array_merge($userContestCollections, $publicCollections);
	}

	protected function getEditCollectionPrivilege($collection, $user)
	{
		$isOwner = ValidationHelper::hasRightsByOwnerRef($collection, $user);
		$relation = TeamCollection::where('collection_id', $collection->id)->first();

		if (empty($relation) || $isOwner) {
			return $isOwner;
		}

		// Init
		$teamAuthorized = false;
		$hostAuthorized = false;
		$contestAuthorized = false;
		$hostRelations = [];
		$contestRelations = [];

		$relations = TeamCollection::whereIn('type', ['host', 'category', 'division'])
			->where('collection_id', $collection->id)
			->whereNull('deleted_at')
			->get();

		// View Access by Host Team
		$hostRelation = $relations->where('type', 'host')->first();
		if (!empty($hostRelation)) {
			$hostTeam = Team::where('id', $hostRelation->team_id)
				->whereNull('deleted_at')
				->first();
			$allowedRoles = ['owner', 'admin', 'editor'];
			$hostRelations = TeamUser::with('relation_type')
				->where([['user_id', '=', $user->id], ['team_id', '=', $hostTeam->id]])
				->groupBy('relation_type_id')
				->get()
				->pluck('relation_type.key')
				->toArray();
			$hostAuthorized = $this->teamService->overlaps($hostRelations, $allowedRoles);
		}

		// View Access by Contest Team
		$contestRelation = $relations->where('type', 'category')->first();
		if (!empty($contestRelation)) {
			$contestTeam = Team::where('id', $contestRelation->team_id)
				->whereNull('deleted_at')
				->first();
			$allowedRoles = [
				'owner',
				'admin',
				'team_owner',
				'team_admin',
				'team_leader',
				'team_guide',
				'team_member',
			];

			$contestRelations = $this->contestService->getExpoundedRelations($contestTeam);
			$contestAuthorized = $this->teamService->overlaps($contestRelations, $allowedRoles);
		}

		$userRelations = array_merge($hostRelations, $contestRelations);
		if (!$hostAuthorized && !$contestAuthorized) {
			$this->fail(
				'You dont have access to this collection.',
				$this->errorCodes['invalid_team_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
					'user_relations' => $userRelations,
				]
			);
		}

		// Edit Access
		$allowedRoles = ['owner', 'admin', 'editor', 'team_owner', 'team_admin'];
		$teamAuthorized = !empty(array_intersect($userRelations, $allowedRoles));

		return $teamAuthorized;
	}

	protected function getUserCollections($userRef, $isOwner = false)
	{
		$where = [['owner_ref', '=', $userRef]];

		if (!$isOwner) {
			array_push($where, ['collection_access_type_id', '=', 1]);
		}

		$collection = Collection::where($where)
			->select(
				'collection.*',
				'collection_access_type.key as visibility',
				'collection_type.key as sub_type'
			)
			->join(
				'collection_access_type',
				'collection_access_type.id',
				'collection.collection_access_type_id'
			)
			->join('collection_type', 'collection_type.id', 'collection.collection_type_id_subtype')
			->whereNull('collection.deleted_at')
			->orderBy('updated_at', 'desc')
			->get()
			->makeHidden($this->sanitizeFields);

		// todo: handle pagination later

		return $collection;
	}

	protected function getCollectionStats($collection, $impressions)
	{
		$impressionCount = count($impressions);
		$collectionCreatedImpressions = $this->getCollectionCreatedTastings($collection)->count();
		$averageRating = null;

		if ($impressionCount > 1) {
			$averageRating = $this->getImpressionAverageRating($impressions);
		}

		// Build and organize required rating data
		$collectionStats = new \stdClass();
		$collectionStats = [
			'collectionCreatedImpressions' => $collectionCreatedImpressions,
			'collectionImpressions' => $impressionCount,
			'average_rating' => $averageRating,
		];

		return $collectionStats;
	}

	protected function getCollectionCreatedTastings($collection)
	{
		return $collectionCreatedTastings = Impression::where(
			'collection_id',
			'=',
			$collection->id
		)->whereNull('deleted_at');
	}

	protected function getImpressionAverageRating($impressions)
	{
		//Initialize Average Rating
		$averageRatings = new \stdClass();

		$impressionCount = count($impressions);
		$ratings = array_pluck($impressions, 'rating');

		if ($impressionCount > 0) {
			$average_final_points = array_sum(array_column($ratings, 'final_points'));
			$average_balance = array_sum(array_column($ratings, 'balance'));
			$average_length = array_sum(array_column($ratings, 'length'));
			$average_intensity = array_sum(array_column($ratings, 'intensity'));
			$average_terroir = array_sum(array_column($ratings, 'terroir'));
			$average_complexity = array_sum(array_column($ratings, 'complexity'));

			$averageRatings = [
				'final_points' => round($average_final_points / $impressionCount, 2),
				'balance' => round($average_balance / $impressionCount, 2),
				'length' => round($average_length / $impressionCount, 2),
				'intensity' => round($average_intensity / $impressionCount, 2),
				'terroir' => round($average_terroir / $impressionCount, 2),
				'complexity' => round($average_complexity / $impressionCount, 2),
			];
		}

		return $averageRatings;
	}

	protected function importCollectionData($ref, $filePayload)
	{
		$collection = Collection::where('ref', '=', $ref)
			->whereNull('deleted_at')
			->first();
		$owner = User::where('ref', '=', $collection->owner_ref)->first();
		$importData = FileHelper::parseJsonFile($filePayload);

		$importImpressions = $importData['wines'];
		$impressionRefs = [];

		$importIndex = 0;
		foreach ($importImpressions as $importImpression) {
			$impression = $this->collectionService->importImpression(
				$importImpression,
				$collection,
				$importIndex
			);
			$impression->impression_type_id = 1;
			$impression->lifecycle_id = 1;
			$impression->save();
			$impressionRefs[] = $impression->ref;
			$importIndex++;
		}

		$this->saveCollectionImpressions($collection, $owner, $impressionRefs);

		return $collection;
	}
}
