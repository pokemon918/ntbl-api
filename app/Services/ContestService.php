<?php
namespace App\Services;

use App\Helpers\FileHelper;
use App\Helpers\StringHelper;
use App\Helpers\Commons;
use App\Helpers\ValidationHelper;
use App\Models\ActionType;
use App\Models\Collection;
use App\Models\CollectionType;
use App\Models\CollectionAccessType;
use App\Models\TeamCollection;
use App\Models\CollectionImpression;
use App\Models\ContestTeam;
use App\Models\File;
use App\Models\Identity;
use App\Models\Impression;
use App\Models\RelationType;
use App\Models\Team;
use App\Models\TeamAccessType;
use App\Models\TeamUser;
use App\Models\TeamType;
use App\Models\TeamAction;
use App\Models\TeamSubjectStatement;
use App\Models\User;
use App\Services\CollectionService;
use App\Services\ImpressionService;
use App\Services\MailService;
use App\Services\UserService;
use Auth;
use Carbon\Carbon;
use HJSON\HJSONParser;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Arr;

class ContestService extends TeamService
{
	private $implementation = 'NTBL'; //Hardcoded fixed value for namespacing passwords
	private $errorMessage = '';
	private $errorKey = '';
	private $errorField = '';
	private $country = null;
	private $avatarPayloadKey = 'avatar';
	private $responseData = [];
	private $teams = null;
	private $searchResults = [];
	private $userOwnedResults = false;
	private $hiddenAccessType = null;
	private $errorType = 'contest';

	function __construct()
	{
		$this->refLength = config('app.identity.refLength');
		$this->refMaxLength = config('app.identity.refMaxLength');
		$this->ruleMessages = config('app.ruleMessages');
		$this->errorCodes = config('app.errorCodes');
		$this->fileRefLength = config('app.file.refLength');
		$this->contestRoles = config('app.team.roles.contest');
		$this->divisionRoles = config('app.team.roles.division');
		$this->inviteRegisteredUserTemplate = 'InviteRegisteredUserToTeam';
		$this->inviteNonRegisteredUserTemplate = 'InviteNonRegisteredUserToTeam';
		$this->collectionService = new CollectionService();
		$this->impressionService = new ImpressionService();
		$this->mailService = new MailService();
		$this->userService = new UserService();
	}

	/**
	 * Creates a contest team
	 *
	 * @return $contest - formatted
	 */
	public function createContestTeam($payload)
	{
		$this->validateCreateContestTeamPayload($payload);
		$handleTaken = Team::where('handle', array_get($payload, 'handle'))->exists();

		// Assign a unique random handle to the contest team, if not provided or taken
		if (!isset($payload['handle']) || $handleTaken) {
			$payload['handle'] = StringHelper::readableRefGenerator(
				$this->refLength,
				'team',
				'handle'
			);
		}

		// Set the contest team visibility to "hidden" by force
		$payload['visibility'] = 'hidden';

		// Create the team
		$team = $this->createTeam($payload, 'contest');

		// Create the contest team
		$contestTeam = new ContestTeam();
		$contestTeam->team_id = $team->id;
		$contestTeam->admin_alias = array_get($payload, 'alias.admin');
		$contestTeam->leader_alias = array_get($payload, 'alias.leader');
		$contestTeam->guide_alias = array_get($payload, 'alias.guide');
		$contestTeam->participant_alias = array_get($payload, 'alias.member');
		$contestTeam->collection_alias = array_get($payload, 'alias.collection');
		$contestTeam->theme_alias = array_get($payload, 'alias.theme');
		$contestTeam->save();

		return $this->getContestDataViaTeam($contestTeam->team);
	}

	/**
	 * Creates a division team tied to the given contest
	 *
	 * @return void
	 */
	public function createDivisionTeam($contestRef, $payload)
	{
		// Ignore other fields other than name, description and handle. Note: Remove this line in case you want to enable all the fields from the payload.
		$payload = $this->trimPayload($payload, ['name', 'description', 'handle']);

		// Validate the payload
		$this->validateCreateDivisionTeamPayload($payload);
		$handleTaken = Team::where('handle', array_get($payload, 'handle'))->exists();

		// Assign a unique random handle to the division team, if not provided
		if (!isset($payload['handle']) || $handleTaken) {
			$payload['handle'] = StringHelper::readableRefGenerator(
				$this->refLength,
				'team',
				'handle'
			);
		}

		// Set the contest team visibility to "hidden" by default
		$payload['visibility'] = 'hidden';

		// Create the division team
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);
		$team = $this->createTeam($payload, 'division', $contest->id);
		return $team;
		//return $this->getContestDataViaTeam($team);
	}

	/**
	 * Deletes the division team tied to the given contest
	 *
	 * @return $contest - formatted
	 */
	public function deleteDivisionTeam($contestRef, $teamRef)
	{
		ValidationHelper::validateEntityExists($contestRef, 'team', 'ref');
		ValidationHelper::validateEntityExists($teamRef, 'team', 'ref');
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);

		$divisionTeam = Team::where([
			['ref', '=', $teamRef],
			['parent_id', '=', $contest->id],
		])->first();
		$this->validateDivisionTeam($contest, $divisionTeam); #movelater
		$divisionTeam->delete();
		return $this->getContestDataViaTeam($contest);
	}

	/**
	 * Adds a collection that is tied to the given contest
	 *
	 * @return void
	 */
	public function createContestCollection($ref, $payload)
	{
		$this->validateContestCollectionPayload($payload); #movelater
		$contest = $this->getTeamByRef($ref, 'contest');
		$this->validateTeamAuthority($contest);
		$collection = $this->addTeamCollection($payload, $contest);
		return $collection;
		//return $this->getContestDataViaTeam($contest);
	}

	public function removeContestCollection($teamRef, $collectionRef)
	{
		$team = $this->getTeamByRef($teamRef, 'contest');
		$this->validateTeamAuthority($team);
		$collection = $this->deleteContestCollection($collectionRef, $team);
		return $collection;
	}

	public function getContestDataFromRef($ref)
	{
		// $contest = $this->getTeamByRef($ref, 'contest');
		// return $this->getContestDataViaTeam($contest);   // Original

		$contest = $this->getContestFullDataByRef($ref);
		//return $this->getContestDataViaTeamV2($contest); // Smart
		return $this->getContestDataViaTeamV3($contest); // Cut contest data out
	}

	public function getContestFullDataByRef($ref, $type = 'contest')
	{
		$currentUser = Auth::user();
		$teamType = TeamType::where('key', '=', $type)->first();

		$contest = Team::with([
			'contestTeam',
			'teamType',
			'relations',
			'relations.user',
			'relations.user.identity',
			'relations.relation_type',
			'actions',
			'childTeams',
			'childTeams.relations',
			'childTeams.relations.relation_type',
			'teamCollections',
			'teamCollections.collection',
		])
			->where([['ref', '=', $ref], ['team_type_id', '=', $teamType->id]])
			->first();

		// $contest = Team::with(['contestTeam', 'teamType', 'childTeams'])
		// 	->with([
		// 		'relations' => function ($query) use ($currentUser) {
		// 			$query
		// 				->where('user_id', '=', $currentUser->user_id)
		// 				->groupBy('relation_type_id')
		// 				->with(['relation_type']);
		// 		}
		// 	])
		// 	->with([
		// 		'childTeams.relations' => function ($query) use ($currentUser) {
		// 			$query
		// 				->where('user_id', '=', $currentUser->user_id)
		// 				->groupBy('relation_type_id');
		// 		}
		// 	])
		// 	->with([
		// 		'actions' => function ($query) use ($currentUser) {
		// 			$query
		// 				->where('user_id', '=', $currentUser->user_id)
		// 				->groupBy('relation_type_id')
		// 				->with(['actionType', 'relationType']);
		// 		}
		// 	])
		// 	->where([['ref', '=', $ref], ['team_type_id', '=', $teamType->id]])
		// 	->first();

		if (empty($contest)) {
			if (is_array($type)) {
				$msg =
					'Team [' .
					$ref .
					'] is not of a [' .
					implode(', ', $type) .
					'] type or does not exist.';
			} else {
				$msg = 'Team [' . $ref . '] is not of a [' . $type . '] type or does not exist.';
			}
			ValidationHelper::fail($msg, $this->errorCodes['exists'], '', __FILE__, __LINE__, [
				'team_ref' => $ref,
			]);
		}

		return $contest;
	}

	public function getContestDataViaTeamV3($contest)
	{
		// Build data here...
		$currentUser = Auth::user();
		$data = [];

		// General Info
		$data = $this->getGeneralContestInfoV2($contest);
		$userRelations = $data['user_relations'];
		$data['alias'] = $this->getContestAliases($contest->contestTeam); #movelater
		// Every other role with assignment
		if (
			$this->overlaps($userRelations, [
				'owner',
				'admin',
				'team_owner',
				'team_admin',
				'team_leader',
				'team_guide',
				'team_member',
			])
		) {
			$data['participants'] = $this->getContestParticipantsV3(
				$contest,
				$currentUser,
				$userRelations
			);

			$data['teams'] = $this->getDivisionTeamsV2($contest, $currentUser, $userRelations);

			/*$data['collections'] = $this->getContestCollectionsV2(
				$contest,
				$currentUser,
				$userRelations
			);*/

			$data['collections'] = $this->getContestCollectionsV3(
				$contest,
				$userRelations,
				$data['teams']
			);
		}

		// Admin Only Data
		if ($this->overlaps($userRelations, ['owner', 'admin'])) {
			$data['admins'] = $this->getContestAdmins($contest); #movelater
			$data['themes'] = $this->getContestThemes($contest); #movelater
			$data['statements'] = $this->getTeamStatements($contest); #leaveInTeamService
		}

		return $data;
	}

	public function getContestCollectionsV2(
		$contestTeam,
		$currentUser,
		$userRelations,
		$duration = false
	) {
		$collectionIds = [];

		// Every Collection
		if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
			$collectionIds = $contestTeam->teamCollections->pluck('collection_id');
		}

		// Collections that are assigned to the current user's division
		if ($this->overlaps($userRelations, ['team_leader', 'team_guide', 'team_member'])) {
			// Extract Division
			$divisionRoleIds = RelationType::whereIn('key', $this->divisionRoles)
				->get()
				->pluck('id');
			$divisionId = TeamUser::whereIn('relation_type_id', $divisionRoleIds)
				->where('user_id', $currentUser->id)
				->get()
				->pluck('team_id')
				->first();

			// Get collection id's from the filtered data
			$collectionIds = TeamCollection::where('team_id', $divisionId)->pluck('collection_id');
		}

		return $this->buildCollectionDataV2($collectionIds, $duration);
	}

	public function getContestCollectionsV3($contest, $userRelations, $teams, $duration = false)
	{
		// Every Collection
		if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
			$collections = $contest->teamCollections
				->where('team_id', $contest->id)
				->pluck('collection');
		}

		// Collections that are assigned to the current user's division
		if ($this->overlaps($userRelations, ['team_leader', 'team_guide', 'team_member'])) {
			$collectionRefs = array_flatten(array_pluck($teams, 'collections'));

			if (empty($collectionRefs)) {
				return [];
			}

			$collections = $contest->teamCollections
				->whereIn('collection.ref', $collectionRefs)
				->pluck('collection');
		}

		if ($duration) {
			$collections = $collections->filter(function ($collection) {
				return ($collection->start_date <= Carbon::now() &&
					$collection->end_date >= Carbon::now()) ||
					$collection->end_date == null;
			});
		}

		return $collections;
	}

	public function getContestCollectionsV4($contestTeam, $currentUser, $duration = false)
	{
		$results = DB::select(
			"select 

		c.ref,
		c.name,
		c.theme,
		c.metadata,
		c.start_date,
		c.end_date
		
		 FROM 
		" .
				DB_PREFIX .
				"user u
		 inner join " .
				DB_PREFIX .
				"team_user tu on tu.user_id = u.id
		 inner join " .
				DB_PREFIX .
				"relation_type rt on tu.relation_type_id = rt.id
		 inner join " .
				DB_PREFIX .
				"team t on tu.team_id = t.id
		 inner join " .
				DB_PREFIX .
				"team_collection tc on tc.team_id = t.id  
		 inner join " .
				DB_PREFIX .
				"collection c on tc.collection_id = c.id
		 inner join  " .
				DB_PREFIX .
				"team_collection contest_tc on contest_tc.collection_id = c.id  
		  inner join  " .
				DB_PREFIX .
				"team contest_t on contest_tc.team_id = contest_t.id  
		
		where 1 
		 and u.ref = ?
		 and tu.relation_type_id 
		 and tu.deleted_at is NULL
		 and t.deleted_at is NULL
		 and rt.`key` in ('leader', 'guide', 'member')
		 and contest_t.ref = ?
		  and tc.deleted_at is NULL " .
				($duration ? ' and now() between c.start_date and c.end_date' : ''),
			[$currentUser, $contestTeam]
		);

		return $results;
	}

	private function buildCollectionDataV2($collectionIds, $duration = false)
	{
		if (empty($collectionIds)) {
			return [];
		}

		$collectionData = [];

		$collectionsBuilder = Collection::select(
			'ref',
			'name',
			'theme',
			'metadata',
			'start_date',
			'end_date'
		)->whereIn('id', $collectionIds);

		if ($duration) {
			$collectionsBuilder = $collectionsBuilder->where(function ($query) {
				$query
					->where([
						['start_date', '<=', Carbon::now()],
						['end_date', '>=', Carbon::now()],
					])
					->orWhereNull('end_date');
			});
		}

		$collections = $collectionsBuilder->get();

		foreach ($collections as $collection) {
			$collectionData[] = $collection;
		}

		return $collectionData;
	}

	public function saveJoinContestTeamRequest($user, $team, $type)
	{
		$allowedRoles = ['admin', 'participant'];
		$joinRequest = $this->saveJoinRequest($user, $team, $type, $allowedRoles);
		return $joinRequest;
	}

	public function inviteUsersToContest($contestRef, $roleKey, $invitedUsers)
	{
		$this->validateRole($roleKey, ['admin', 'participant']);
		$contest = $this->getTeamByRef(strtolower($contestRef), 'contest');
		$this->validateInviteAuthority($contest, ['owner', 'admin']);
		return $this->saveInvites($invitedUsers, $contest, $roleKey);
	}

	public function assignParticipantToDivisionTeam($contestRef, $userRef, $divisionRef)
	{
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$division = $this->getTeamByRef($divisionRef, 'division');
		$this->validateDivisionTeam($contest, $division);
		$this->validateTeamAuthority($contest);
		ValidationHelper::validateEntityExists($userRef, 'user', 'ref');
		$participant = User::getUserByRef($userRef);
		$participantRelations = $this->getRelations($contest->ref, $participant);
		$divisionRelations = $this->getRelations($division->ref, $participant);

		$this->validateDivisionParticipant(
			$participant,
			$participantRelations,
			$divisionRelations,
			$division
		);

		$newRoles = $this->assignContestParticipant($participant, $contest, $division);
	}

	public function removeParticipantFromDivisionTeam($contestRef, $userRef, $divisionRef)
	{
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$division = $this->getTeamByRef($divisionRef, 'division');
		$this->validateDivisionTeam($contest, $division);
		$this->validateTeamAuthority($contest);
		ValidationHelper::validateEntityExists($userRef, 'user', 'ref');
		$participant = User::getUserByRef($userRef);
		$participantRelations = $this->getRelations($contest->ref, $participant);
		$divisionRelations = $this->getRelations($division->ref, $participant);
		$this->validateRemoveDivisionParticipant(
			$participant,
			$participantRelations,
			$divisionRelations,
			$division
		);

		$this->removeContestParticipant($participant, $division);
	}

	public function assignParticipantRole($contestRef, $userRef, $roleKey)
	{
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);
		ValidationHelper::validateEntityExists($userRef, 'user', 'ref');
		$participant = User::getUserByRef($userRef);
		$division = $this->getParticipantDivision($contest, $participant); #movelater
		$this->validateRole($roleKey, $this->divisionRoles);
		$role = $this->getRole($roleKey);
		$this->setParticipantRole($participant, $division, $role);
	}

	public function assignCollectionToDivision($contestRef, $collectionRef, $divisionRef)
	{
		$this->validateTeamAndCollection($contestRef, $collectionRef);
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);
		$division = $this->getTeamByRef($divisionRef, 'division');
		$this->validateDivisionTeam($contest, $division);
		$collection = $this->collectionService->getCollection($collectionRef);
		return $this->addTeamCollectionRelation($collection, $division, 'division');
		//return $this->getContestDataViaTeam($contest);
	}

	public function removeCollectionFromDivision($contestRef, $collectionRef, $divisionRef)
	{
		$this->validateTeamAndCollection($contestRef, $collectionRef);
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);
		$division = $this->getTeamByRef($divisionRef, 'division');
		$this->validateDivisionTeam($contest, $division);
		$collection = $this->collectionService->getCollection($collectionRef);
		return $this->deleteTeamCollectionRelation($collection, $division, 'division');
		//return $this->getContestDataViaTeam($contest);
	}

	public function addOrUpdateContestStatement(
		$user,
		$contestRef,
		$collectionRef,
		$impressionRef,
		$payload
	) {
		// Validate Payload
		$this->validateTeamStatementPayload($payload);

		// Validate that the collection is related to the contest
		$this->validateTeamAndCollection($contestRef, $collectionRef, 'contest', 'category');
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);
		$collection = $this->collectionService->getCollection($collectionRef);
		$impression = $this->impressionService->getImpression($impressionRef);

		// Validate that the impression is related to the contest-collection
		$collectionImpression = $this->collectionService->getCollectionImpression(
			$collection,
			$impression,
			'active'
		);
		$this->collectionService->validateCollectionImpression(
			$collection,
			$impression,
			$collectionImpression
		);

		// Validate that the subject/marked_impression (when filled) takes after a contest-collection-impression
		$subjectRef = array_get($payload, 'marked_impression');
		$subject = $this->impressionService->getImpression($subjectRef, true);
		$this->validateImpressionSubject($impression, $subject);

		$currentUser = Auth::user();

		$statement = $this->addOrUpdateTeamSubjectStatement(
			$payload,
			$collectionImpression,
			$contest,
			$currentUser
		);

		return $statement;
	}

	public function addOrUpdateDivisionStatement(
		$contestRef,
		$collectionRef,
		$divisionRef,
		$impressionRef,
		$payload
	) {
		$this->validateTeamStatementPayload($payload);
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$division = $this->getTeamByRef($divisionRef, 'division');
		$this->validateDivisionTeam($contest, $division);
		$this->validateContestAndDivisionAuthority($contest, $division); #movelater
		$collection = $this->collectionService->getCollection($collectionRef);

		// Validate that the collection is related to the contest
		$this->validateTeamCollectionOwnership($contest, $collection, 'category');

		// Validate that the collection is assigned to the division
		$this->validateTeamCollectionOwnership($division, $collection, 'division');

		$impression = $this->impressionService->getImpression($impressionRef);

		// Validate that the impression is related to the contest-collection
		$collectionImpression = $this->collectionService->getCollectionImpression(
			$collection,
			$impression,
			'active'
		);
		$this->collectionService->validateCollectionImpression(
			$collection,
			$impression,
			$collectionImpression
		);

		// Validate that the subject/marked_impression (when filled) takes after a contest-collection-impression
		$subjectRef = array_get($payload, 'marked_impression');
		$subject = $this->impressionService->getImpression($subjectRef, true);
		$this->validateImpressionSubject($impression, $subject);

		$currentUser = Auth::user();
		$statement = $this->addOrUpdateTeamSubjectStatement(
			$payload,
			$collectionImpression,
			$division,
			$currentUser
		);

		return $statement;
	}

	public function getContestProgress($contestRef)
	{
		// Fetch
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$currentUser = Auth::user();
		$userRelations = $this->getExpoundedRelations($contest); #movelater
		$this->validateTeamAuthority($contest, ['owner', 'admin']);
		$collections = $this->getContestCollections($contest, $currentUser, $userRelations); #movelater
		$divisions = $this->getDivisionTeams($contest, $currentUser, $userRelations); #movelater
		// Format
		$contest = $this->prepareContestProgressContestTeam($contest);
		$statements = $this->prepareContestProgressStatements($divisions);
		$collections = $this->prepareContestProgressCollection($collections, $statements);
		$contest->collections = $collections;

		return $contest;
	}

	public function getStatementSummaryV2($contestRef, $teamRef)
	{
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$team = $this->getTeamByRef($teamRef, ['contest', 'division']);
		$this->validateContestAndDivisionAuthority($contest, $team);

		// If team is a division, it should be a part of the contest
		if ($team->teamType->key == 'division') {
			$this->validateDivisionTeam($contest, $team);
		}

		$currentUser = Auth::user();
		$userRelations = $this->getExpoundedRelations($team);
		$this->validateTeamAuthority($team, ['owner', 'admin', 'leader']);

		/* Return the total num of collections by collection ref */
		$dbPrefix = DB_PREFIX;

		$results = DB::select(
			"
			select 
			c.theme,
			s.statement,
			s.extra_a,
			s.extra_b,
			s.extra_c,
			s.extra_d,
			s.extra_e,
			sub.name,
			sub.producer,
			sub.country,
			sub.region,
			sub.vintage,
			sub.grape,
			sub.price,
			sub.currency,
			sub.clean_key,
			sub.producer_key,
			sub.region_key,
			c.start_date,
			c.end_date
			
			from
			{$dbPrefix}team_subject_statement s  
			   LEFT JOIN {$dbPrefix}collection_impression ci on s.`collection_impression_id` = ci.id
			   LEFT JOIN {$dbPrefix}impression i on ci.impression_id = i.id
			   LEFT JOIN {$dbPrefix}collection c on ci.collection_id = c.id
			   LEFT JOIN {$dbPrefix}subject sub on sub.id = i.subject_id
			   LEFT JOIN {$dbPrefix}team t on s.team_id = t.id
		
			where 1
			and statement is not null
							 AND t.ref = ?",
			[$teamRef]
		);

		return $results;
	}

	public function prepareContestProgressContestTeam($contest)
	{
		unset($contest->avatar);
		unset($contest->city);
		unset($contest->country);
		unset($contest->created_at);
		unset($contest->updated_at);
		unset($contest->teamCollections);
		return $contest;
	}

	public function getDivisionProgressV2($contestRef, $teamRef)
	{
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$team = $this->getTeamByRef($teamRef, ['contest', 'division']);
		$this->validateContestAndDivisionAuthority($contest, $team);

		// If team is a division, it should be a part of the contest
		if ($team->teamType->key == 'division') {
			$this->validateDivisionTeam($contest, $team);
		}

		$currentUser = Auth::user();
		$userRelations = $this->getExpoundedRelations($contest);
		$this->validateTeamAuthority($contest, ['owner', 'admin']);

		return $this->rawProgressData($contestRef, $teamRef); // todo: update wiki of new output
	}

	public function getContestStats($contestRef, $collectionRef, $onlymolds = false)
	{
		$this->validateTeamAndCollection($contestRef, $collectionRef);
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);
		$collection = $this->collectionService->getCollection($collectionRef);

		if ($onlymolds === '1') {
			return $this->getTeamSubjects($collection);
		}

		return $this->buildTeamStats($contest, $contest, $collection);
	}

	public function getTeamStats($contestRef, $collectionRef, $divisionRef)
	{
		$this->validateTeamAndCollection($contestRef, $collectionRef);
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$division = $this->getTeamByRef($divisionRef, 'division');
		$this->validateContestAndDivisionAuthority($contest, $division); #movelater
		$this->validateDivisionTeam($contest, $division);
		$collection = $this->collectionService->getCollection($collectionRef);
		$this->validateTeamCollectionOwnership($division, $collection, 'division');
		$teamStats = $this->buildTeamStats($contest, $division, $collection);
		return $teamStats;
	}

	public function addUserMetadataForContest($contestRef, $userRef, $payload)
	{
		$metadata = Commons::convertJsonStringOrObject($payload);
		$this->validateMetadata($metadata); #todo: check if TeamService->validateMetadata is a direct duplicate of ValidationHelper::validateMetadata
		ValidationHelper::validateEntityExists($userRef, 'user', 'ref');
		$targetUser = User::getUserByRef($userRef);
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);
		$this->validateContestUserRelation($contest, $targetUser, $this->contestRoles); #movelater
		$this->saveContestUserMetadata($contest, $targetUser, $metadata);

		return [
			'ref' => $targetUser->ref,
			'name' => $targetUser->name,
			'metadata' => $metadata,
		];
	}

	public function getUserMetadataForContest($contestRef, $userRef)
	{
		ValidationHelper::validateEntityExists($userRef, 'user', 'ref');
		$targetUser = User::getUserByRef($userRef);
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);
		$this->validateContestUserRelation($contest, $targetUser, $this->contestRoles);
		$userRelations = TeamUser::getUserRelations($targetUser->id, $contest->id)->first();

		return [
			'metadata' => $userRelations->metadata,
		];
	}

	public function getStatementSummary($contestRef)
	{
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$currentUser = Auth::user();
		$userRelations = $this->getExpoundedRelations($contest);
		$this->validateTeamAuthority($contest, ['owner', 'admin']);
		$contestCollections = $this->getContestCollections($contest, $currentUser, $userRelations);
		$contestStatements = $this->getTeamStatements($contest);
		$aggregatedThemes = $this->getAggregatedThemes($contestCollections, $contestStatements);
		return $aggregatedThemes;
	}

	public function copyParticipants($targetRef, $sourceRef, $roleKey)
	{
		$this->validateSameTeamCopy($sourceRef, $targetRef); #todo: check if can be refactored
		$sourceContest = $this->getTeamByRef($sourceRef, 'contest');
		$this->validateTeamAuthority($sourceContest);
		$targetContest = $this->getTeamByRef($targetRef, 'contest');
		$this->validateTeamAuthority($targetContest);
		$this->validateTeamTransferRoles($roleKey);
		$copiedData = $this->copyTeamUsers($sourceContest, $targetContest, $roleKey);
		return $copiedData;
	}

	public function getContestExportData($contestRef)
	{
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest);
		return $this->buildContestExportData($contest);
	}

	public function resetDivisionMembers($contestRef)
	{
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$this->validateTeamAuthority($contest, ['owner', 'admin']);
		$this->removeContestDivisionMembers($contest);
		$this->resetContestConfirmedArrival($contest);
	}

	public function getFeaturedUserContests($userRef)
	{
		// Get contests that the user is an owner and admin of. contest/2264
		$featured = [];

		$contests = $this->getUserTeams($userRef, ['owner', 'admin'], 'contest');
		foreach ($contests as $contest) {
			$data = $this->getGeneralContestInfo($contest);
			array_push($featured, $data);
		}

		// Get contests that the user is a leader of contest/2264
		$divisions = $this->getUserTeams($userRef, ['leader'], 'division');
		$leaderContestIds = $divisions->pluck('parent_id');
		$leaderContests = Team::whereIn('id', $leaderContestIds)->get();
		foreach ($leaderContests as $contest) {
			$data = $this->getGeneralContestInfo($contest);
			array_push($featured, $data);
		}

		return $featured;
	}

	public function acceptAllRequests($contestRef, $userRef)
	{
		$this->acceptAllTeamRequests($contestRef, $userRef, 'contest');
	}

	public function getDivisionProgress($contestRef, $teamRef)
	{
		$contest = $this->getTeamByRef($contestRef, 'contest');
		$team = $this->getTeamByRef($teamRef, ['contest', 'division']);
		$this->validateContestAndDivisionAuthority($contest, $team);

		// If team is a division, it should be a part of the contest
		if ($team->teamType->key == 'division') {
			$this->validateDivisionTeam($contest, $team);
		}

		$currentUser = Auth::user();
		$userRelations = $this->getExpoundedRelations($contest);
		$this->validateTeamAuthority($contest, ['owner', 'admin']);

		// Quick Model Version
		$teamCollections = TeamCollection::with(['collection', 'collection.collectionImpressions'])
			->has('collection')
			->where('team_id', $team->id)
			->get();

		$data = new \stdClass();

		foreach ($teamCollections as $teamCollection) {
			$collectionImpressions = $teamCollection->collection->collectionImpressions;
			$theme = $teamCollection->collection->theme;
			$total = $collectionImpressions->count();
			$pseudoMolds = $collectionImpressions->pluck('id');
			$done = TeamSubjectStatement::whereIn('collection_impression_id', $pseudoMolds)
				->where('team_id', $team->id)
				->count();

			$data->$theme = new \stdClass();
			$data->$theme->total = $total;
			$data->$theme->done = $done;
		}

		return $data;
		// Quick Model Version

		// todo : Raw SQL Ver
		// Uncomment this to restore
		// return $this->getTeamProgress($team);
	}

	public function getExpoundedRelations($team)
	{
		$currentUser = Auth::user();

		// Get user relations, relative to the contest
		$userRelations = $this->getRelations($team->ref, $currentUser);

		// If user is already related to the contest, further check if he/she has relations to any division
		if (!empty($userRelations)) {
			$userDivisionRelations = [];

			// All related divisions must be acquired at this point
			$divisions = Team::where('parent_id', '=', $team->id)->get();

			foreach ($divisions as $division) {
				$relations = $this->getRelations($division['ref'], $currentUser);
				$relations = array_map(function ($relation) {
					return 'team_' . $relation;
				}, $relations);
				$userDivisionRelations = array_merge($userDivisionRelations, $relations);
			}
			$userRelations = array_merge($userRelations, $userDivisionRelations);
		}

		// If user is not related to the contest or any of its division, check if he has requested or invited to be part of the contest
		if (empty($userRelations)) {
			// join requests
			$pendingAdminJoinRequests = $this->getPendingTeamActionByRelation(
				$currentUser,
				$team,
				'join',
				'admin'
			);
			$pendingParticipantJoinRequests = $this->getPendingTeamActionByRelation(
				$currentUser,
				$team,
				'join',
				'participant'
			);

			// invites
			$pendingAdminInvitations = $this->getPendingTeamActionByRelation(
				$currentUser,
				$team,
				'invite',
				'admin'
			);
			$pendingParticipantInvitations = $this->getPendingTeamActionByRelation(
				$currentUser,
				$team,
				'invite',
				'participant'
			);

			if (!empty($pendingAdminJoinRequests)) {
				array_push($userRelations, 'requested_admin');
			}

			if (!empty($pendingParticipantJoinRequests)) {
				array_push($userRelations, 'requested_participant');
			}

			if (!empty($pendingAdminInvitations)) {
				array_push($userRelations, 'invited_admin');
			}

			if (!empty($pendingParticipantInvitations)) {
				array_push($userRelations, 'invited_participant');
			}
		}

		// If user really has no relations to the team, make user as unrelated
		if (empty($userRelations)) {
			array_push($userRelations, 'unrelated');
		}

		return array_unique($userRelations);
	}

	public function getExpoundedRelationsV2($team)
	{
		$currentUser = Auth::user();
		$eagerLoadedRelations = $team->relations
			->where('user_id', '=', $currentUser->user_id)
			->unique('relation_type_id');

		$userRelations = $this->getRolesFromRelations($eagerLoadedRelations);

		// If user is already related to the contest, further check if he/she has relations to any division
		if (!empty($userRelations)) {
			$userDivisionRelations = [];

			// All related divisions must be acquired at this point
			foreach ($team->childTeams as $division) {
				$eagerLoadedRelations = $division->relations
					->where('user_id', '=', $currentUser->user_id)
					->unique('relation_type_id');
				$relations = $this->getRolesFromRelations($eagerLoadedRelations);
				$relations = array_map(function ($relation) {
					return 'team_' . $relation;
				}, $relations);
				$userDivisionRelations = array_merge($userDivisionRelations, $relations);
			}

			$userRelations = array_merge($userRelations, $userDivisionRelations);
		}

		// If user is not related to the contest or any of its division, check if he has requested or invited to be part of the contest
		if (empty($userRelations)) {
			$pendingAdminJoinRequests = $this->filterTeamActionsByRelationAndType(
				$currentUser,
				$team->actions,
				'admin',
				'join'
			);
			$pendingParticipantJoinRequests = $this->filterTeamActionsByRelationAndType(
				$currentUser,
				$team->actions,
				'participant',
				'join'
			);
			$pendingAdminInvitations = $this->filterTeamActionsByRelationAndType(
				$currentUser,
				$team->actions,
				'admin',
				'invite'
			);
			$pendingParticipantInvitations = $this->filterTeamActionsByRelationAndType(
				$currentUser,
				$team->actions,
				'participant',
				'invite'
			);

			if (!empty($pendingAdminJoinRequests)) {
				array_push($userRelations, 'requested_admin');
			}

			if (!empty($pendingParticipantJoinRequests)) {
				array_push($userRelations, 'requested_participant');
			}

			if (!empty($pendingAdminInvitations)) {
				array_push($userRelations, 'invited_admin');
			}

			if (!empty($pendingParticipantInvitations)) {
				array_push($userRelations, 'invited_participant');
			}
		}

		// If user really has no relations to the team, make user as unrelated
		if (empty($userRelations)) {
			array_push($userRelations, 'unrelated');
		}

		return array_unique($userRelations);
	}

	public function getUserContests($user)
	{
		$contestPossibleRoles = RelationType::whereIn('key', ['owner', 'admin', 'participant'])
			->get()
			->pluck('id');

		$contestIds = TeamUser::whereIn('relation_type_id', $contestPossibleRoles)
			->where('user_id', $user->id)
			->get()
			->pluck('team_id');

		$contestTeamType = TeamType::where('key', 'contest')->first();

		return Team::whereIn('id', $contestIds)
			->where('team_type_id', $contestTeamType->id)
			->get();
	}

	public function copyRequestsAndInvites($targetRef, $sourceRef, $roleKey)
	{
		$this->validateSameTeamCopy($sourceRef, $targetRef);
		$sourceContest = $this->getTeamByRef($sourceRef, 'contest');
		$this->validateTeamAuthority($sourceContest);
		$targetContest = $this->getTeamByRef($targetRef, 'contest');
		$this->validateTeamAuthority($targetContest);
		$this->validateTeamTransferRoles($roleKey);
		$copiedData = $this->copyTeamRequestAndInvites($sourceContest, $targetContest, $roleKey);
		return $copiedData;
	}

	/* PRIVATE METHODS */

	/**
	 * Makes sure that the target user is related to the contest
	 *
	 * @return void
	 */
	protected function validateContestUserRelation($contest, $user, $roles)
	{
		$userRelations = $this->getRelations($contest->ref, $user);
		$isParticipantOrAdmin = $this->isTeamMember($userRelations, $roles);

		// The user must be related to the contest and must be a participant or an admin
		if (empty($userRelations) && !$isParticipantOrAdmin) {
			ValidationHelper::fail(
				'User is not related to the contest.',
				$this->errorCodes['contest_not_assigned'],
				'',
				__FILE__,
				__LINE__,
				[
					'contest_ref' => $contest->ref,
					'user_ref' => $user->ref,
				]
			);
		}
	}

	private function validateDivisionTeam($contest, $division)
	{
		// Must Exist
		if (empty($contest) || empty($division)) {
			ValidationHelper::fail(
				'Invalid contest / division.',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				null
			);
		}

		// Division must be part of the contest
		if ($division->parent_id != $contest->id) {
			ValidationHelper::fail(
				'Division Team [' . $division->ref . '] is not part of the contest.',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'contest_ref' => $contest->ref,
					'division_ref' => $division->ref,
				]
			);
		}
	}

	private function getParticipantDivision($contest, $participant, $queryOnly = false)
	{
		// Get Divisions within the Contest
		$divisionType = TeamType::where('key', 'division')->first();
		$divisionIds = Team::where([
			['parent_id', $contest->id],
			['team_type_id', $divisionType->id],
		])
			->get()
			->pluck('id');

		// Get Division Relation
		$divisionRelation = TeamUser::whereIn('team_id', $divisionIds)
			->where('user_id', $participant->id)
			->groupBy('user_id')
			->first();

		// Check for Division Relation before going further
		if (empty($divisionRelation)) {
			if ($queryOnly) {
				return;
			}

			ValidationHelper::fail(
				'User is not a participant or assigned on any division.',
				$this->errorCodes['contest_not_assigned'],
				'',
				__FILE__,
				__LINE__,
				[
					'contest_ref' => $contest->ref,
					'participant_ref' => $participant->ref,
				]
			);
		}

		// Get Division
		$division = Team::where('id', $divisionRelation->team_id)->first();

		return $division;
	}

	private function filterTeamActionsByRelationAndType(
		$currentUser,
		$teamActions,
		$relation,
		$type,
		$status = 'pending'
	) {
		return $teamActions
			->filter(function ($action, $i) use ($currentUser, $relation, $type, $status) {
				return $action->user_id == $currentUser->id &&
					$action->status == $status &&
					$action->relationType->key == $relation &&
					$action->actionType->key == $type;
			})
			->toArray();
	}

	protected function validateContestAndDivisionAuthority(
		$contest,
		$division,
		$contestAuthorizedRoles = ['owner', 'admin'],
		$divisionAuthorizedRoles = ['leader']
	) {
		// Get Contest Authority
		$currentUserContestRelations = TeamUser::getCurrentUserRelations($contest->id);

		if (!empty($currentUserContestRelations)) {
			$contestAuthority = ValidationHelper::getTeamAuthority(
				$currentUserContestRelations,
				$contestAuthorizedRoles
			);
			$contestAuthority = $contestAuthority['authority'];
			$contestAuthorized = $contestAuthority['isOwner'] || $contestAuthority['isAdmin'];
		}

		// Get Contest Division Authority
		$currentUserContestDivisionRelations = TeamUser::getCurrentUserRelations($division->id);

		if (!empty($currentUserContestDivisionRelations)) {
			$divisionAuthority = ValidationHelper::getTeamAuthority(
				$currentUserContestDivisionRelations,
				$divisionAuthorizedRoles
			);
			$divisionAuthority = $divisionAuthority['authority'];
			$divisionAuthorized = $divisionAuthority['isLeader'];
		}

		// Return and do nothing if user is authorized
		if ($contestAuthorized || $divisionAuthorized) {
			return;
		}

		// Fail if user has NO contest authority or division authority
		ValidationHelper::fail(
			'User is not authorized.',
			$this->errorCodes['invalid_access'],
			'',
			__FILE__,
			__LINE__,
			[
				'contest' => $contest->ref,
				'division' => $division->ref,
			]
		);
	}

	private function getContestDataViaTeam($team)
	{
		// Contest/2194 describes what data to give
		$contestTeam = $team->contestTeam;
		$currentUser = Auth::user();
		$data = [];

		// General Info
		$data = $this->getGeneralContestInfo($team);
		$userRelations = $data['user_relations'];
		$data['alias'] = $this->getContestAliases($contestTeam);

		// Every other role with assignment
		if (
			$this->overlaps($userRelations, [
				'owner',
				'admin',
				'team_owner',
				'team_admin',
				'team_leader',
				'team_guide',
				'team_member',
			])
		) {
			$data['participants'] = $this->getContestParticipants(
				$team,
				$currentUser,
				$userRelations
			);
			$data['teams'] = $this->getDivisionTeams($team, $currentUser, $userRelations);
			$data['collections'] = $this->getContestCollections(
				$team,
				$currentUser,
				$userRelations
			);
		}

		// Admin Only Data
		if ($this->overlaps($userRelations, ['owner', 'admin'])) {
			$data['admins'] = $this->getContestAdmins($team);
			$data['themes'] = $this->getContestThemes($team);
			$data['statements'] = $this->getTeamStatements($team);
		}

		return $data;
	}

	public function getContestDataViaTeamV2($contest)
	{
		// Build data here...
		$currentUser = Auth::user();
		$data = [];

		// General Info
		$data = $this->getGeneralContestInfoV2($contest);
		$userRelations = $data['user_relations'];
		$data['alias'] = $this->getContestAliases($contest->contestTeam);

		// Every other role with assignment
		if (
			$this->overlaps($userRelations, [
				'owner',
				'admin',
				'team_owner',
				'team_admin',
				'team_leader',
				'team_guide',
				'team_member',
			])
		) {
			$data['participants'] = $this->getContestParticipantsV2(
				$contest,
				$currentUser,
				$userRelations
			);
			$data['teams'] = $this->getDivisionTeamsV2($contest, $currentUser, $userRelations);
			$data['collections'] = $this->getContestCollections(
				$contest,
				$currentUser,
				$userRelations
			);
		}

		// Admin Only Data
		if ($this->overlaps($userRelations, ['owner', 'admin'])) {
			$data['admins'] = $this->getContestAdmins($contest);
			$data['themes'] = $this->getContestThemes($contest);
			$data['statements'] = $this->getTeamStatements($contest);
		}

		return $data;
	}

	private function getContestParticipantsV2($contestTeam, $currentUser, $userRelations)
	{
		$participantRelations = TeamUser::getByRelationKey($contestTeam->id, 'participant');
		$participantIds = $participantRelations->pluck('user_id');

		// Every Participant
		if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
			$participantIds = TeamUser::getByRelationKey($contestTeam->id, 'participant')->pluck(
				'user_id'
			);
		}

		// Division-mates Only
		if ($this->overlaps($userRelations, ['team_leader'])) {
			$division = $this->getParticipantDivision($contestTeam, $currentUser);
			$divisionRelationTypeIds = RelationType::whereIn('key', $this->divisionRoles)->pluck(
				'id'
			);

			$participantIds = TeamUser::whereIn('relation_type_id', $divisionRelationTypeIds)
				->where('team_id', $division->id)
				->groupBy('user_id')
				->get()
				->pluck('user_id');
		}

		// Self Only
		if ($this->overlaps($userRelations, ['team_guide', 'team_member'])) {
			$division = $this->getParticipantDivision($contestTeam, $currentUser);
			$divisionRelationTypeIds = RelationType::whereIn('key', $this->divisionRoles)->pluck(
				'id'
			);

			$participantIds = TeamUser::whereIn('relation_type_id', $divisionRelationTypeIds)
				->where([['team_id', $division->id], ['user_id', $currentUser->id]])
				->groupBy('user_id')
				->get()
				->pluck('user_id');
		}

		return $this->buildParticipantDataV2(
			$contestTeam,
			$participantIds,
			$participantRelations,
			$userRelations
		);
	}

	private function buildParticipantDataV2(
		$contestTeam,
		$participantIds,
		$participantRelations,
		$userRelations
	) {
		if (empty($participantIds)) {
			return [];
		}

		$participantData = [];

		// Get division team type
		$divisionType = TeamType::where('key', 'division')->first();

		// Get divisions under this contest
		$divisionIds = Team::where([
			['parent_id', $contestTeam->id],
			['team_type_id', $divisionType->id],
		])
			->get()
			->pluck('id');

		// Get participants under all division
		$participants = User::with([
			'identity',
			'teamUserRelations' => function ($query) use ($divisionIds) {
				$query->whereIn('team_id', $divisionIds);
			},
			'teamUserRelations.team',
			'teamUserRelations.relation_type',
		])
			->whereIn('id', $participantIds)
			->get();

		foreach ($participants as $participant) {
			/* Collection Queries (not SQL) */
			$divisionRelations = $participant->teamUserRelations
				->where('user_id', $participant->id)
				->first();
			$division = empty($divisionRelations) ? null : $divisionRelations->team;
			$role = empty($divisionRelations) ? null : $divisionRelations->relation_type;
			$contestUserRelation = $participantRelations
				->where('user_id', $participant->id)
				->first();

			$data = [
				'ref' => $participant->ref,
				'name' => $participant->name,
				'division' => empty($division) ? null : $division->ref,
				'role' => empty($role) ? null : $role->key,
				'metadata' => $contestUserRelation->metadata,
			];

			// Include email in the data if requester is admin
			if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
				$data['email'] = $participant->identity->email;
			}

			$participantData[] = $data;
		}

		return $participantData;
	}

	protected function getTeamStatements($division)
	{
		if (empty($division)) {
			return [];
		}

		$statements = TeamSubjectStatement::where([
			['team_id', $division->id],
			['statement', '!=', ''],
		])
			->whereNotNull('statement')
			->get();

		foreach ($statements as $statement) {
			$statement->metadata = $statement->metadata;
			$statement->requested = $statement->requested;
			$statement->flag = $statement->flag;
		}

		return $statements;
	}

	protected function getContestThemes($contestTeam)
	{
		$collectionIds = $contestTeam->teamCollections->pluck('collection_id');
		return Collection::whereIn('id', $collectionIds)
			->where('theme', '!=', '')
			->whereNotNull('theme')
			->groupBy('theme')
			->get()
			->pluck('theme');
	}

	protected function getContestAdmins($contestTeam)
	{
		$relationTypeIds = RelationType::whereIn('key', ['owner', 'admin'])
			->get()
			->pluck('id');
		$adminRelations = $contestTeam->relations->whereIn('relation_type_id', $relationTypeIds);
		$adminIds = $adminRelations->pluck('user_id');

		$adminData = [];
		if (!empty($adminIds)) {
			$admins = User::whereIn('id', $adminIds)->get();
			foreach ($admins as $admin) {
				$roleIds = $adminRelations->where('user_id', $admin->id)->pluck('relation_type_id');
				$adminData[] = [
					'ref' => $admin->ref,
					'name' => $admin->name,
					'metadata' => $admin->metadata,
				];
			}
		}

		return $adminData;
	}

	protected function getContestCollections(
		$contestTeam,
		$currentUser,
		$userRelations,
		$duration = false
	) {
		$collectionIds = [];

		// Every Collection
		if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
			$collectionIds = $contestTeam->teamCollections->pluck('collection_id');
		}

		// Collections that are assigned to the current user's division
		if ($this->overlaps($userRelations, ['team_leader', 'team_guide', 'team_member'])) {
			// Extract Division
			$divisionRoleIds = RelationType::whereIn('key', $this->divisionRoles)
				->get()
				->pluck('id');
			$divisionId = TeamUser::whereIn('relation_type_id', $divisionRoleIds)
				->where('user_id', $currentUser->id)
				->get()
				->pluck('team_id')
				->first();

			// Get collection id's from the filtered data
			$collectionIds = TeamCollection::where('team_id', $divisionId)->pluck('collection_id');
		}

		return $this->buildCollectionData($collectionIds, $duration);
	}

	private function buildCollectionData($collectionIds, $duration = false)
	{
		if (empty($collectionIds)) {
			return [];
		}

		$collectionData = [];

		$collectionsBuilder = Collection::with([
			'collectionType',
			'collectionSubType',
			'impressions.origin',
			'impressions.subject',
			'impressions.individual',
			'impressions.rating',
			'impressions.infos',
			'impressions.impressionNotes.note',
			'impressions.impressionFiles.file',
			'impressions.collection',
			'impressions.team',
		])->whereIn('id', $collectionIds);

		if ($duration) {
			$collectionsBuilder = $collectionsBuilder->where(function ($query) {
				$query
					->where([
						['start_date', '<=', Carbon::now()],
						['end_date', '>=', Carbon::now()],
					])
					->orWhereNull('end_date');
			});
		}

		$collections = $collectionsBuilder->get();

		foreach ($collections as $collection) {
			// Format Type
			$collection->visibility = $collection->collectionAccessType->key ?? null;
			$collection->sub_type = $collection->collectionSubType->key ?? null;
			unset($collection->collectionAccessType);
			unset($collection->collectionType);
			unset($collection->collectionSubType);

			// Format Impressions
			if (!empty($collection->impressions)) {
				$rawImpressions = $collection->impressions;
				unset($collection->impressions);
				$collection->impressions = $rawImpressions->map(function ($impression) {
					return $this->impressionService->buildImpressionData($impression);
				}, $rawImpressions);
			}
			$collectionData[] = $collection;
		}

		return $collectionData;
	}

	protected function getContestAliases($contestTeam)
	{
		return [
			'admin' => array_get($contestTeam, 'admin_alias'),
			'leader' => array_get($contestTeam, 'leader_alias'),
			'guide' => array_get($contestTeam, 'guide_alias'),
			'member' => array_get($contestTeam, 'participant_alias'),
			'collection' => array_get($contestTeam, 'collection_alias'),
			'theme' => array_get($contestTeam, 'theme_alias'),
		];
	}

	// todo: compare this to develop branch
	protected function getDivisionTeams($contestTeam, $user, $userRelations)
	{
		$rawDivisionTeams = [];
		$divisionRoleIds = RelationType::whereIn('key', $this->divisionRoles)
			->get()
			->pluck('id');

		// Every Division
		if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
			$rawDivisionTeams = Team::where('parent_id', '=', $contestTeam->id)->get();
		}

		// Division the user is assigned to
		if ($this->overlaps($userRelations, ['team_leader', 'team_guide', 'team_member'])) {
			// Extract Divisions
			$divisionIds = TeamUser::whereIn('relation_type_id', $divisionRoleIds)
				->where('user_id', $user->id)
				->get()
				->pluck('team_id');
			// Get Actual Divisions
			$rawDivisionTeams = Team::whereIn('id', $divisionIds)
				->where('parent_id', '=', $contestTeam->id)
				->get();
		}

		$divisionData = [];
		foreach ($rawDivisionTeams as $team) {
			// Division Member Count
			$members = TeamUser::whereIn('relation_type_id', $divisionRoleIds)
				->where('team_id', $team->id)
				->groupBy('user_id')
				->get()
				->count();

			// Extract and Format Collections Assigned to the Division
			$collectionRefs = $this->getDivisionCollectionRefs($team);

			// Append Formatted Data
			array_push($divisionData, [
				'ref' => $team->ref,
				'name' => $team->name,
				'handle' => $team->handle,
				'description' => $team->description,
				'members' => $members,
				'collections' => $collectionRefs,
				'statements' => $this->getTeamStatements($team),
			]);
		}

		return $divisionData;
	}

	private function getContestParticipants($contestTeam, $currentUser, $userRelations)
	{
		$relationType = RelationType::where('key', '=', 'participant')->first();
		$participantRelations = $contestTeam->relations->where(
			'relation_type_id',
			$relationType->id
		);

		$participantIds = $participantRelations->pluck('user_id');

		// Every Participant
		if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
			$participantIds = $contestTeam->relations
				->where('relation_type_id', $relationType->id)
				->pluck('user_id');
		}

		// Division-mates Only
		if ($this->overlaps($userRelations, ['team_leader'])) {
			$division = $this->getParticipantDivision($contestTeam, $currentUser);
			$divisionRelationTypeIds = RelationType::whereIn('key', $this->divisionRoles)->pluck(
				'id'
			);

			$participantIds = TeamUser::whereIn('relation_type_id', $divisionRelationTypeIds)
				->where('team_id', $division->id)
				->groupBy('user_id')
				->get()
				->pluck('user_id');
		}

		// Self Only
		if ($this->overlaps($userRelations, ['team_guide', 'team_member'])) {
			$division = $this->getParticipantDivision($contestTeam, $currentUser);
			$divisionRelationTypeIds = RelationType::whereIn('key', $this->divisionRoles)->pluck(
				'id'
			);

			$participantIds = TeamUser::whereIn('relation_type_id', $divisionRelationTypeIds)
				->where([['team_id', $division->id], ['user_id', $currentUser->id]])
				->groupBy('user_id')
				->get()
				->pluck('user_id');
		}

		return $this->buildParticipantData(
			$contestTeam,
			$participantIds,
			$participantRelations,
			$userRelations
		);
	}

	private function buildParticipantData(
		$contestTeam,
		$participantIds,
		$participantRelations,
		$userRelations
	) {
		if (empty($participantIds)) {
			return [];
		}

		$participantData = [];
		$divisionType = TeamType::where('key', 'division')->first();
		$participants = User::with('identity')
			->whereIn('id', $participantIds)
			->get();

		//$divisionRelationTypeIds = RelationType::whereIn('key', $this->divisionRoles)->pluck('id');

		foreach ($participants as $participant) {
			// Get Role
			$division = $this->getParticipantDivision($contestTeam, $participant, true);
			$divisionRole = null;

			if (!empty($division)) {
				$divisionRoleIds = TeamUser::where([
					['team_id', $division->id],
					['user_id', $participant->id],
				])->pluck('relation_type_id');
				$divisionRole = RelationType::whereIn('id', $divisionRoleIds)
					->pluck('key')
					->first();
			}

			$contestUserRelation = $participantRelations
				->where('user_id', $participant->id)
				->first();

			$data = [
				'ref' => $participant->ref,
				'name' => $participant->name,
				'division' => empty($division) ? null : $division->ref,
				'role' => empty($divisionRole) ? null : $divisionRole,
				'metadata' => $contestUserRelation->metadata,
			];

			if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
				$data['email'] = $participant->identity->email;
			}

			$participantData[] = $data;
		}

		return $participantData;
	}

	public function getGeneralContestInfo($contest)
	{
		return [
			'ref' => $contest->ref,
			'handle' => $contest->handle,
			'name' => $contest->name,
			'description' => $contest->description,
			'type' => $contest->teamType->key,
			'avatar' => $contest->avatar,
			'user_relations' => $this->getExpoundedRelations($contest),
		];
	}

	public function removeContestDivisionMembers($contest)
	{
		$contestDivisions = Team::with('relations')
			->where('parent_id', '=', $contest->id)
			->get();
		$userRelations = $contestDivisions->pluck('relations')->flatten();
		TeamUser::whereIn('id', $userRelations->pluck('id')->toArray())->delete();
	}

	public function resetContestConfirmedArrival($contest)
	{
		$contestRelations = $contest->relations;
		TeamUser::whereIn('id', $contestRelations->pluck('id')->toArray())->update([
			'metadata->confirmed_arrival' => null,
		]);
	}

	private function buildContestExportData($contest)
	{
		$collectionImpressionIds = $contest->teamCollections->pluck('collection_id');
		$rawExportData = CollectionImpression::with([
			'impression',
			'impression.origin',
			'impression.subject',
			'impression.individual',
			'impression.rating',
			'impression.infos',
			'impression.team',
			'impression.collection',
			'impression.impressionNotes.note',
			'impression.impressionFiles.file',
			'impression.moldedImpressions',
			'impression.moldedImpressions.origin',
			'impression.moldedImpressions.subject',
			'impression.moldedImpressions.individual',
			'impression.moldedImpressions.rating',
			'impression.moldedImpressions.infos',
			'impression.moldedImpressions.impressionNotes.note',
			'impression.moldedImpressions.impressionFiles.file',
			'impression.moldedImpressions.owner',
			'impression.moldedImpressions.owner.identity',
			'impression.moldedImpressions.owner.markedImpressions',
			'impression.moldedImpressions.collection',
			'impression.moldedImpressions.team',
			'statements',
		])
			->whereIn('collection_id', $collectionImpressionIds)
			->get();

		return $this->buildContestMoldExportData($rawExportData);
	}

	private function buildContestMoldExportData($rawExportData)
	{
		/*
			Output Nesting Level - Entity
			1 Mold
				2 Molded Impressions
					3 User
						4 Identity
						4 Marked Impression
=					3 Team
			1 Statements
		*/

		$exportData = [];

		// Main loop * number of molds
		foreach ($rawExportData as $rawData) {
			// Add formatted data to list
			$exportData[] = [
				'mold' => $this->impressionService->buildImpressionData($rawData->impression),
				'impressions' => $rawData->impression->moldedImpressions->map(function (
					$impression
				) {
					// Clone before data is stripped
					$owner = $impression->owner;
					$impressionId = $impression->id;

					// Format impression
					$impression = $this->impressionService->buildImpressionData($impression);

					// Add owner data / who tasted the wine
					$impression['creator']['ref'] = $owner->ref;
					$impression['creator']['name'] = $owner->name;
					$impression['creator']['email'] = $owner->identity->email;

					// "boolean if the creator has marked this impression" , Illuminate/Collection query (not db) , ->exists() is not an available method, hence vanilla empty was used
					$impression['creator']['marked'] = !empty(
						$owner->markedImpressions->where('impression_id', $impressionId)->first()
					);

					return $impression;
				}),
				'statements' => $rawData->statements,
			];
		}

		return $exportData;
	}

	private function getAggregatedThemes($contestCollections, $contestStatements)
	{
		$aggregatedThemes = [];

		// find all distinct themes
		$themes = array_unique(Arr::pluck($contestCollections, 'theme'));

		// find all distinct statements
		$statements = array_unique(Arr::pluck($contestStatements, 'statement'));

		$aggregatedThemes = [];
		$aggregatedStatements = [];

		foreach ($themes as $theme) {
			$aggregatedTheme = [];
			$aggregatedTheme['theme'] = $theme;

			// Get collections that has the current theme.
			$themeCollections = $this->getCollectionsByTheme($theme, $contestCollections);

			// For each statement we find all the impressions
			foreach ($statements as $statement) {
				$aggregatedStatements[$statement] = [];

				// get team subject statements by the current statement
				$statementStatements = $this->getTeamSubjectStatementByStatement(
					$statement,
					$contestStatements
				);

				// Get the impressions from each statementStatements in the current theme
				foreach ($statementStatements as $statementStatement) {
					if (empty($aggregatedStatements[$statement])) {
						$aggregatedStatements[$statement] = $this->getSubjectsFromStatementsInTheme(
							$statementStatement,
							$themeCollections
						);
					} else {
						$subjects = $this->getSubjectsFromStatementsInTheme(
							$statementStatement,
							$themeCollections
						);
						$aggregatedStatements[$statement] = array_merge(
							$aggregatedStatements[$statement],
							$subjects
						);
					}
				}

				// Only include the statements if they are not empty
				if (empty($aggregatedStatements[$statement])) {
					unset($aggregatedStatements[$statement]);
				}
			}
			$aggregatedTheme['statements'] = $aggregatedStatements;
			array_push($aggregatedThemes, $aggregatedTheme);
		}

		return $aggregatedThemes;
	}

	private function getCollectionsByTheme($theme, $collections)
	{
		$themeCollections = [];
		foreach ($collections as $collection) {
			if ($collection->theme == $theme) {
				array_push($themeCollections, $collection);
			}
		}
		return $themeCollections;
	}

	private function getTeamSubjectStatementByStatement($statement, $teamStatements)
	{
		$statementStatements = [];
		foreach ($teamStatements as $teamStatement) {
			if ($teamStatement->statement == $statement) {
				array_push($statementStatements, $teamStatement);
			}
		}
		return $statementStatements;
	}

	private function getSubjectsFromStatementsInTheme($statementStatement, $themeCollections)
	{
		$subjects = [];
		foreach ($themeCollections as $themeCollection) {
			if ($statementStatement->collectionImpression->collection_id == $themeCollection->id) {
				$subject = $this->impressionService->buildImpressionData(
					$statementStatement->collectionImpression->impression
				);
				array_push($subjects, $subject);
			}
		}
		return $subjects;
	}

	private function saveContestUserMetadata($contest, $user, $metadata)
	{
		$userRelations = TeamUser::getUserRelations($user->id, $contest->id);
		$userRelations->map(function ($relation) use ($metadata) {
			$key = $relation->relation_type->key;

			if (in_array($key, $this->contestRoles)) {
				$relation->metadata = $metadata;
				$relation->save();
			}
		});
	}

	private function rawProgressData($contestRef, $teamRef)
	{
		$results = DB::select(
			"SELECT   
				c.theme, 
				count(ci.id) AS total,
				count(CASE WHEN s.statement IS NULL THEN 1 END) AS todo,
				count(ci.id) - count(CASE WHEN s.statement IS NULL THEN 1 END) AS done
				FROM   " .
				DB_PREFIX .
				"collection c 
                   LEFT JOIN " .
				DB_PREFIX .
				"team_collection tc 
                          ON tc.collection_id = c.id 
                   LEFT JOIN " .
				DB_PREFIX .
				"team t         
                   		ON tc.team_id = t.id
                   LEFT JOIN " .
				DB_PREFIX .
				"collection_impression ci 
                          ON ci.collection_id = c.id and ci.type = 'active'
                   LEFT JOIN " .
				DB_PREFIX .
				"team_subject_statement s 
                                ON s.collection_impression_id = ci.id AND s.team_id = t.id
            WHERE t.ref = ?
               group by c.theme;",
			[$teamRef]
		);

		return $results;
	}

	private function prepareContestProgressCollection($collections, $statements)
	{
		foreach ($collections as $collection) {
			$collection->subjects = count($collection->impressions);
			unset($collection->impressions);
			$collection->team_statements = $statements;
		}
		return $collections;
	}

	private function prepareContestProgressStatements($divisions)
	{
		$statements = [];
		foreach ($divisions as $division) {
			$statements[] = [
				$division['ref'] => count($division['statements']),
			];
		}
		return $statements;
	}

	private function setParticipantRole($participant, $division, $role)
	{
		// Clear other roles within the division
		$allowedRoleIds = RelationType::whereIn('key', $this->divisionRoles)
			->get()
			->pluck('id');

		$participantOtherRelations = TeamUser::whereIn('relation_type_id', $allowedRoleIds)
			->where([['user_id', '=', $participant->id], ['team_id', '=', $division->id]])
			->delete();

		// Assign new division role
		$newRole = new TeamUser();
		$newRole->user_id = $participant->id;
		$newRole->team_id = $division->id;
		$newRole->relation_type_id = $role->id;
		$newRole->save();

		return $newRole;
	}

	private function removeContestParticipant($participant, $division)
	{
		$relationTypeIds = RelationType::whereIn('key', $this->divisionRoles)
			->get()
			->pluck('id');

		$divisionRelations = TeamUser::whereIn('relation_type_id', $relationTypeIds)->where([
			['user_id', $participant->id],
			['team_id', $division->id],
		]);

		$divisionRelations->delete();

		return $divisionRelations;
	}

	private function validateRemoveDivisionParticipant(
		$participant,
		$participantRelations,
		$divisionRelations,
		$division
	) {
		if (empty($participant)) {
			ValidationHelper::fail(
				'Participant does not exist.',
				$this->errorCodes['user_does_not_exist'],
				'',
				__FILE__,
				__LINE__,
				null
			);
		}

		// Must be participant of the contest
		$allowedParticipantRoles = ['participant'];
		if (!$this->isTeamMember($participantRelations, $allowedParticipantRoles)) {
			ValidationHelper::fail(
				'User is not a participant of this contest',
				$this->errorCodes['contest_not_participant'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $participant->ref,
				]
			);
		}

		// Must not already be in the target division
		if (!$this->isTeamMember($divisionRelations, $this->divisionRoles)) {
			ValidationHelper::fail(
				'User is not a member of this division',
				$this->errorCodes['contest_not_participant'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $participant->ref,
				]
			);
		}
	}

	private function assignContestParticipant($participant, $contest, $division)
	{
		$allowedRoles = RelationType::whereIn('key', $this->divisionRoles)->get();
		$allowedRoleIds = $allowedRoles->pluck('id');
		$contestDivisions = Team::where('parent_id', $contest->id)
			->get()
			->pluck('id');

		$participantOtherRelationsBuilder = TeamUser::whereIn('relation_type_id', $allowedRoleIds)
			->whereIn('team_id', $contestDivisions)
			->where('user_id', '=', $participant->id);

		$participantOtherRelations = $participantOtherRelationsBuilder->get();

		// Forced role , if not within other division
		if ($participantOtherRelations->isEmpty()) {
			$memberType = $allowedRoles->where('key', '=', 'member')->first();
			$divisionRole = new TeamUser();
			$divisionRole->user_id = $participant->id;
			$divisionRole->team_id = $division->id;
			$divisionRole->relation_type_id = $memberType->id;
			$divisionRole->save();
			return [$memberType->key];
		}

		// Remove all relations to other divisions within the contest
		$participantOtherRelationsBuilder->delete();

		// Maintain the same roles on the new division
		$roleIds = [];
		foreach ($participantOtherRelations as $participantOtherRelation) {
			$divisionRole = new TeamUser();
			$divisionRole->user_id = $participant->id;
			$divisionRole->team_id = $division->id;
			$divisionRole->relation_type_id = $participantOtherRelation->relation_type_id;
			$divisionRole->save();
			$roleIds[] = $participantOtherRelation->relation_type_id;
		}

		// Translate Role Id's into Keys
		$roleData = RelationType::whereIn('id', $roleIds)
			->get()
			->pluck('key');

		return $roleData;
	}

	private function validateDivisionParticipant(
		$participant,
		$participantRelations,
		$divisionRelations,
		$division
	) {
		if (empty($participant)) {
			ValidationHelper::fail(
				'Participant does not exist.',
				$this->errorCodes['user_does_not_exist'],
				'',
				__FILE__,
				__LINE__,
				null
			);
		}

		// Must be participant of the contest
		$allowedParticipantRoles = ['participant'];
		if (!$this->isTeamMember($participantRelations, $allowedParticipantRoles)) {
			ValidationHelper::fail(
				'User is not a participant of this contest',
				$this->errorCodes['contest_not_participant'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $participant->ref,
				]
			);
		}

		// Must not already be in the target division
		$this->validateAlreadyTeamMember(
			$divisionRelations,
			$this->divisionRoles,
			$participant,
			$division
		);
	}

	private function getDivisionTeamsV2($contestTeam, $user, $userRelations)
	{
		$rawDivisionTeams = [];
		$divisionRoleIds = RelationType::whereIn('key', $this->divisionRoles)
			->get()
			->pluck('id');

		$baseDivisionQuery = Team::with([
			'relations' => function ($query) use ($divisionRoleIds) {
				$query->whereIn('relation_type_id', $divisionRoleIds)->groupBy('user_id');
			},
		]);

		// Every Division
		if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
			$rawDivisionTeams = $baseDivisionQuery
				->where('parent_id', '=', $contestTeam->id)
				->get();
		}

		// Division the user is assigned to
		if ($this->overlaps($userRelations, ['team_leader', 'team_guide', 'team_member'])) {
			// Extract Divisions
			$divisionIds = TeamUser::whereIn('relation_type_id', $divisionRoleIds)
				->where('user_id', $user->id)
				->get()
				->pluck('team_id');
			// Get Actual Divisions
			$rawDivisionTeams = $baseDivisionQuery
				->whereIn('id', $divisionIds)
				->where('parent_id', '=', $contestTeam->id)
				->get();
		}

		$divisionData = [];

		foreach ($rawDivisionTeams as $team) {
			// Division Member Count
			$members = $team->relations->count();

			// Extract and Format Collections Assigned to the Division
			$collectionRefs = $this->getDivisionCollectionRefs($team);

			// Append Formatted Data
			array_push($divisionData, [
				'ref' => $team->ref,
				'name' => $team->name,
				'handle' => $team->handle,
				'description' => $team->description,
				'members' => $members,
				'collections' => $collectionRefs,
				'statements' => $this->getTeamStatements($team), #movelater
			]);
		}

		return $divisionData;
	}

	public function getDivisionCollectionRefs($division)
	{
		$collectionIds = TeamCollection::where('team_id', $division->id)
			->get()
			->pluck('collection_id');

		return Collection::whereIn('id', $collectionIds)
			->get()
			->pluck('ref');
	}

	private function getContestParticipantsV3($contestTeam, $currentUser, $userRelations)
	{
		$participantRelations = $contestTeam->relations->filter(function ($relation) {
			return $relation->relation_type->key == 'participant';
		});
		$participantIds = $participantRelations->pluck('user_id');

		// Every Participant
		if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
			$participantIds = $contestTeam->relations->filter(function ($relation) {
				return $relation->relation_type->key == 'participant';
			});

			$participantIds = $participantRelations->pluck('user_id');
		}

		// Division-mates Only
		if ($this->overlaps($userRelations, ['team_leader'])) {
			$division = $this->getParticipantDivision($contestTeam, $currentUser);
			$divisionRelationTypeIds = RelationType::whereIn('key', $this->divisionRoles)->pluck(
				'id'
			);

			$participantIds = TeamUser::whereIn('relation_type_id', $divisionRelationTypeIds)
				->where('team_id', $division->id)
				->groupBy('user_id')
				->get()
				->pluck('user_id');
		}

		// Self Only
		if ($this->overlaps($userRelations, ['team_guide', 'team_member'])) {
			$division = $this->getParticipantDivision($contestTeam, $currentUser);
			$divisionRelationTypeIds = RelationType::whereIn('key', $this->divisionRoles)->pluck(
				'id'
			);

			$participantIds = TeamUser::whereIn('relation_type_id', $divisionRelationTypeIds)
				->where([['team_id', $division->id], ['user_id', $currentUser->id]])
				->groupBy('user_id')
				->get()
				->pluck('user_id');
		}

		return $this->buildParticipantDataV3(
			$contestTeam,
			$participantIds,
			$participantRelations,
			$userRelations
		);
	}

	private function buildParticipantDataV3(
		$contestTeam,
		$participantIds,
		$participantRelations,
		$userRelations
	) {
		if (empty($participantIds)) {
			return [];
		}

		$participantData = [];
		$contestRelations = $contestTeam->relations->whereIn('user_id', $participantIds);

		foreach ($contestRelations as $relation) {
			$role = $relation->relation_type->key;
			$division = null;

			foreach ($contestTeam->childTeams as $team) {
				$divisionRelation = $team->relations->where('user_id', $relation->user_id)->first();
				if (!empty($divisionRelation)) {
					// print_r($divisionRelation->toArray());

					$division = $team;
					$role = $divisionRelation->relation_type->key;
				}
			}

			$participant = $relation->user;

			$data = [
				'ref' => $participant->ref,
				'name' => $participant->name,
				'division' => empty($division) ? null : $division->ref,
				'role' => $role,
				'metadata' => $relation->metadata,
			];

			// Include email in the data if requester is admin
			if ($this->overlaps($userRelations, ['owner', 'admin', 'team_owner', 'team_admin'])) {
				$data['email'] = $participant->identity->email;
			}

			$participantData[] = $data;
		}

		return $participantData;
	}

	private function getGeneralContestInfoV2($contest)
	{
		return [
			'ref' => $contest->ref,
			'handle' => $contest->handle,
			'name' => $contest->name,
			'description' => $contest->description,
			'type' => $contest->teamType->key,
			'avatar' => $contest->avatar,
			'user_relations' => $this->getExpoundedRelationsV2($contest),
		];
	}

	private function deleteContestCollection($collectionRef, $team)
	{
		$collectionType = CollectionType::where('key', '=', 'event')->first();
		$subType = CollectionType::where('key', '=', 'unknown')->first();
		$collection = Collection::where([
			['ref', '=', $collectionRef],
			['collection_type_id', '=', $collectionType->id],
			['collection_type_id_subtype', '=', $subType->id],
		])->first();

		if (empty($collection)) {
			ValidationHelper::fail(
				'Contest Collection [' . $collectionRef . '] does not exist.',
				$this->errorCodes['exists'],
				'',
				__FILE__,
				__LINE__,
				[
					'collection_ref' => $collectionRef,
				]
			);
		}

		// Unlink the contest collection from contest team
		$this->deleteTeamCollectionRelation($collection, $team, 'category');

		// Delete the collection itself
		$collection->delete();

		return $collection;
	}

	private function validateCreateContestTeamPayload($payload)
	{
		ValidationHelper::validatePayload($payload);

		$rules = [
			'name' => Team::$rules['name'],
			'description' => Team::$rules['description'],
			'admin_alias' => ContestTeam::$rules['alias'],
			'leader_alias' => ContestTeam::$rules['alias'],
			'guide_alias' => ContestTeam::$rules['alias'],
			'participant_alias' => ContestTeam::$rules['alias'],
			'collection_alias' => ContestTeam::$rules['alias'],
			'theme_alias' => ContestTeam::$rules['alias'],
		];

		$data = [
			'name' => array_get($payload, 'name'),
			'description' => array_get($payload, 'description'),
			'admin_alias' => array_get($payload, 'alias.admin'),
			'leader_alias' => array_get($payload, 'alias.leader'),
			'guide_alias' => array_get($payload, 'alias.guide'),
			'participant_alias' => array_get($payload, 'alias.member'),
			'collection_alias' => array_get($payload, 'alias.collection'),
			'theme_alias' => array_get($payload, 'alias.theme'),
		];

		if (isset($payload['handle'])) {
			$handleRule = str_replace('|unique:team,handle', '', Team::$rules['handle']);
			$rules['handle'] = $handleRule;
			$data['handle'] = array_get($payload, 'handle');
		}

		ValidationHelper::validateWithRules($data, $rules);
	}

	private function validateCreateDivisionTeamPayload($payload)
	{
		ValidationHelper::validatePayload($payload);

		$rules = [
			'name' => Team::$rules['name'],
			'description' => Team::$rules['description'],
		];

		$data = [
			'name' => array_get($payload, 'name'),
			'description' => array_get($payload, 'description'),
		];

		if (isset($payload['handle'])) {
			$handleRule = str_replace('|unique:team,handle', '', Team::$rules['handle']);
			$rules['handle'] = $handleRule;
			$data['handle'] = array_get($payload, 'handle');
		}

		ValidationHelper::validateWithRules($data, $rules);
	}
}
