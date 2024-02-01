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
use App\Models\Visibility;
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

class TeamService
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
	private $errorType = 'team';

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

	public function createTeam($payload, $type = 'traditional', $parentId = null)
	{
		$team = new Team();
		$team->ref = StringHelper::readableRefGenerator($this->refLength, 'team', 'ref');
		$handle = strtolower(array_get($payload, 'handle'));
		ValidationHelper::validateRefOrHandleIsUnique($handle, 'team', 'handle');

		$city = array_get($payload, 'city');
		$country = strtoupper(array_get($payload, 'country'));

		$team->handle = $handle;
		$team->name = Commons::convertHTMLToEntities(array_get($payload, 'name'));
		$team->description = Commons::convertHTMLToEntities(array_get($payload, 'description'));

		if (!empty($city)) {
			$team->city = $city;
		}

		if (!empty($country)) {
			$team->country = $country;
		}

		if (!empty($parentId)) {
			$team->parent_id = $parentId;
		}

		$teamAccessPayload = array_get($payload, 'access') ?: 'apply';
		$access_type = TeamAccessType::where('key', $teamAccessPayload)->first();
		$team->team_access_type_id = $access_type->id;

		$visibilityPayload = array_get($payload, 'visibility') ?: 'private';
		$visibility = Visibility::where('key', strtolower($visibilityPayload))->first();
		$team->visibility_id = $visibility->id;

		$teamType = TeamType::where('key', '=', $type)->first();
		$team->team_type_id = $teamType->id;

		$team = $this->processAvatar($team, $payload);
		$team->save();

		$currentUser = Auth::user();
		$role = RelationType::where('key', '=', 'creator')->first(); // Set a fixed relation of "Creator" by force
		$this->setRelation($team, $currentUser, $role);

		$role = RelationType::where('key', '=', 'owner')->first(); // Set a relation of "Owner" for loggedin user when creating a team
		$this->setRelation($team, $currentUser, $role);
		$this->prepareTraditionalTeamResponse($team, $currentUser);
		$team['visibility'] = $visibility->key;
		return $team;
	}

	public function searchByHandle($teamHandle, $type = 'traditional')
	{
		$this->validateHandle($teamHandle);

		$teamHandle = trim(strtolower($teamHandle));
		if (strpos($teamHandle, '@') === 0) {
			$teamHandle = str_replace('@', '', $teamHandle);
		}

		#fixvisibility
		return Team::getByHandleAndVisibility($teamHandle, ['public', 'hidden'], $type);
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
			['deleted_at', '=', null],
		])->first();
		$this->validateDivisionTeam($contest, $divisionTeam);
		$divisionTeam->delete();
		return $this->getContestDataViaTeam($contest);
	}

	public function getContestDataFromRef($ref)
	{
		// $contest = $this->getTeamByRef($ref, 'contest');
		// return $this->getContestDataViaTeam($contest);   // Original

		$contest = $this->getContestFullDataByRef($ref);
		//return $this->getContestDataViaTeamV2($contest); // Smart
		return $this->getContestDataViaTeamV3($contest); // Cut contest data out
	}

	public function getTeamByRef($ref, $type = 'traditional')
	{
		// todo: Optimize the query
		if (is_array($type)) {
			$typeIds = TeamType::whereIn('key', $type)
				->get()
				->pluck('id')
				->toArray();
			$team = Team::where('ref', '=', $ref)
				->whereIn('team_type_id', $typeIds)
				->whereNull('deleted_at')
				->first();
		} else {
			$teamType = TeamType::where('key', '=', $type)->first();
			$team = Team::where([
				['ref', '=', $ref],
				['team_type_id', '=', $teamType->id],
				['deleted_at', '=', null],
			])->first();
		}

		if (empty($team)) {
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

		return $team;
	}

	public function getRelationType($type)
	{
		$relationType = RelationType::where('key', '=', $type)->first();
		if (empty($relationType)) {
			ValidationHelper::fail(
				'The role [' . $type . '] does not exist.',
				$this->errorCodes['exists'],
				'',
				__FILE__,
				__LINE__,
				[
					'relation_type' => $type,
				]
			);
		}

		return $relationType;
	}

	public function saveJoinRequest(
		$user,
		$team,
		$type = 'member',
		$allowedRoles = ['owner', 'admin', 'editor', 'member']
	) {
		$actionType = ActionType::where('key', '=', 'join')->first();
		$relationType = $this->getRelationType($type);
		$userRelations = $this->getRelations($team->ref, $user);
		$this->validateAlreadyTeamMember($userRelations, $allowedRoles, $user, $team);

		$teamAction = TeamAction::where([
			['user_id', '=', $user->id],
			['team_id', '=', $team->id],
			['action_type_id', '=', $actionType->id],
			['status', '=', 'pending'],
		])->first();

		// If you reapply as another thing the original request should change
		if (!empty($teamAction)) {
			$this->validateAlreadyRequestedToJoin($teamAction, $relationType, $user, $team);
			$teamAction->relation_type_id = $relationType->id;
			$teamAction->save();
			$teamAction = $this->prepareTeamActionResponse(
				$teamAction,
				$team,
				$user,
				$relationType
			);
			return $teamAction;
		}

		$teamAction = new TeamAction([
			'ref' => StringHelper::readableRefGenerator($this->refLength, 'team_action', 'ref'),
			'user_id' => $user->id,
			'team_id' => $team->id,
			'action_type_id' => $actionType->id,
			'status' => 'pending',
			'relation_type_id' => $relationType->id,
		]);

		$teamAction->relation_type_id = $relationType->id;
		$teamAction->save();

		return $this->prepareTeamActionResponse($teamAction, $team, $user, $relationType);
	}

	public function addTeamCollection($payload, $team)
	{
		// set the team visibility to "unlisted" by force
		$payload['visibility'] = 'unlisted';

		// todo: See if this collection creation process can be refactored into a collection service
		$collection = new Collection();
		$collection->ref = StringHelper::readableRefGenerator(
			$this->refLength,
			'collection',
			'ref'
		);
		$collection->name = Commons::convertHTMLToEntities(array_get($payload, 'name'));
		$collection->description = Commons::convertHTMLToEntities(
			array_get($payload, 'description')
		);

		// Explicitly setting null on dateTime filed will throw a constraint cannot be null error, even if field is nullable
		// Laravel core handles it by saving is as null when fields is nullable with a default of null and not set in the model
		if (isset($payload['start_date']) && isset($payload['end_date'])) {
			$collection->start_date = array_get($payload, 'start_date', null);
			$collection->end_date = array_get($payload, 'end_date', null);
		}

		$collection->theme = Commons::convertHTMLToEntities(array_get($payload, 'theme', null));

		// Load mandatory fk's with forced values
		$collectionType = CollectionType::where('key', '=', 'event')->first();
		$collection->collection_type_id = $collectionType->id;
		$subType = CollectionType::where('key', '=', 'unknown')->first();
		$collection->collection_type_id_subtype = $subType->id;

		// Use the currently logged in team admin as owner
		$currentUser = Auth::user();
		$collection->owner_ref = $currentUser->ref;

		// Convert metadata
		$collection->metadata = Commons::convertJsonStringOrObject($payload);

		// Add access_type
		$access_type = CollectionAccessType::where('key', $payload['visibility'])->first();
		$collection->collection_access_type_id = $access_type->id;
		$collection->save();

		$this->addTeamCollectionRelation($collection, $team, 'category');

		return $collection;
	}

	protected function addTeamCollectionRelation($collection, $team, $type)
	{
		$this->validateTeamCollectionAlreadyExists($team, $collection, $type);
		$teamCollection = new TeamCollection();
		$teamCollection->team_id = $team->id;
		$teamCollection->collection_id = $collection->id;
		$teamCollection->type = $type;
		$teamCollection->save();
		return $teamCollection;
	}

	protected function deleteTeamCollectionRelation($collection, $team, $teamCollectionType)
	{
		$teamCollectionRelation = $this->getTeamCollection($team, $collection, $teamCollectionType);

		if (empty($teamCollectionRelation)) {
			ValidationHelper::fail(
				'There is no relation between the team and collection.',
				$this->errorCodes['exists'],
				'',
				__FILE__,
				__LINE__,
				[
					'collection' => $collection->ref,
					'team' => $team->ref,
				]
			);
		}

		$teamCollectionRelation->delete();
		return $teamCollectionRelation;
	}

	public function overlaps($userRelations, $allowedRoles)
	{
		return !empty(array_intersect($userRelations, $allowedRoles));
	}

	public function validateTeamAuthority($team, $authorizedRoles = ['owner', 'admin'])
	{
		$currentUserRelations = TeamUser::getCurrentUserRelations($team->id);
		$teamAuthority = ValidationHelper::validateTeamAuthority(
			$currentUserRelations,
			$authorizedRoles
		);
		$authorized =
			$teamAuthority['isOwner'] || $teamAuthority['isAdmin'] || $teamAuthority['isLeader'];

		if (!$authorized) {
			ValidationHelper::fail(
				'User is not authorized.',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'team' => $team->ref,
				]
			);
		}
	}

	protected function buildTeamStats($contest, $team, $collection)
	{
		$teamStats = [
			'collection' => [
				'ref' => $collection->ref,
				'name' => $collection->name,
				'metadata' => $collection->metadata,
			],
			'team' => [
				'ref' => $team->ref,
				'name' => $team->name,
			],
			'subjects' => $this->buildTeamSubjects($team, $collection),
		];

		return $teamStats;
	}

	protected function addOrUpdateTeamSubjectStatement(
		$payload,
		$collectionImpression,
		$team,
		$user
	) {
		$teamStatement = TeamSubjectStatement::where([
			['team_id', $team->id],
			['collection_impression_id', $collectionImpression->id],
		])->first();

		if (empty($teamStatement)) {
			$teamStatement = new TeamSubjectStatement();
		}

		// Save Collection and Subject Ref from Route Param
		$teamStatement->team_id = $team->id;
		$teamStatement->collection_impression_id = $collectionImpression->id;

		// Fields are Optional
		if (isset($payload['marked_impression'])) {
			$teamStatement->marked_impression = array_get($payload, 'marked_impression', null);
		}

		if (isset($payload['flag'])) {
			$teamStatement->flag = array_get($payload, 'flag');
		}

		if (isset($payload['requested'])) {
			$teamStatement->requested = array_get($payload, 'requested');
		}

		if (isset($payload['statement'])) {
			$teamStatement->statement = array_get($payload, 'statement', null);
		}

		if (isset($payload['extra_a'])) {
			$teamStatement->extra_a = array_get($payload, 'extra_a', null);
		}

		if (isset($payload['extra_b'])) {
			$teamStatement->extra_b = array_get($payload, 'extra_b', null);
		}

		if (isset($payload['extra_c'])) {
			$teamStatement->extra_c = array_get($payload, 'extra_c', null);
		}

		if (isset($payload['extra_d'])) {
			$teamStatement->extra_d = array_get($payload, 'extra_d', null);
		}

		if (isset($payload['extra_e'])) {
			$teamStatement->extra_e = array_get($payload, 'extra_e', null);
		}

		if (isset($payload['metadata'])) {
			$teamStatement->metadata = Commons::convertJsonStringOrObject($payload);
		}

		$teamStatement->user_ref = $user->ref;
		$teamStatement->save();

		return $teamStatement;
	}

	private function getTeamProgress($team)
	{
		$rawTeamProgress = TeamSubjectStatement::getTeamProgressGroupedByCollectionTheme($team);
		return $this->buildTeamProgress($rawTeamProgress);
	}

	private function buildTeamProgress($rawTeamProgress)
	{
		$collectionIds = $rawTeamProgress->pluck('collection_id')->toArray();
		$collections = Collection::whereIn('id', $collectionIds)->get();
		$teamProgress = [];

		foreach ($collections as $collection) {
			$ciCounts = $collection->collectionImpressions->count();
			$theme = $collection->theme;

			foreach ($rawTeamProgress as $tpq) {
				$done = $tpq->done;
				if ($tpq->collection_id == $collection->id) {
					if (!isset($teamProgress[$theme])) {
						$teamProgress[$theme]['done'] = $done;
						$teamProgress[$theme]['total'] = $ciCounts;
					} else {
						$teamProgress[$theme]['done'] += $done;
						$teamProgress[$theme]['total'] += $ciCounts;
					}
				}
			}
		}

		return !empty($teamProgress) ? $teamProgress : null;
	}

	public function acceptAllTeamRequests($teamRef, $userRef, $type)
	{
		$team = $this->getTeamByRef($teamRef, $type);
		$this->validateTeamAuthority($team);
		ValidationHelper::validateEntityExists($userRef, 'user', 'ref');
		$targetUser = User::getUserByRef($userRef);
		$allowedRoles = ['owner', 'admin', 'participant'];
		$targetUserRelations = $this->getRelations($team->ref, $targetUser);
		$this->validateAlreadyTeamMember($targetUserRelations, $allowedRoles, $targetUser, $team);

		// Get Requests to become Admin
		$pendingAdminJoinRequests = $this->getPendingTeamActionByRelation(
			$targetUser,
			$team,
			'join',
			'admin'
		);

		// Get Requests to become Participant
		$pendingParticipantJoinRequests = $this->getPendingTeamActionByRelation(
			$targetUser,
			$team,
			'join',
			'participant'
		);

		$this->validateHasPendingJoinTeamRequest(
			$pendingAdminJoinRequests,
			$pendingParticipantJoinRequests,
			$userRef,
			$teamRef,
			$type
		);

		$actionRef = null;
		if (!empty($pendingAdminJoinRequests)) {
			$actionRef = $pendingAdminJoinRequests->ref;
		}

		if (!empty($pendingParticipantJoinRequests)) {
			$actionRef = $pendingParticipantJoinRequests->ref;
		}

		$this->processJoinRequest($team, $actionRef, 'approved');
	}

	public function processJoinRequest(
		$teamToJoin,
		$actionRef,
		$status,
		$allowedRoles = ['owner', 'admin', 'editor', 'member']
	) {
		$teamAction = TeamAction::with([
			'team',
			'user',
			'user.identity',
			'actionType',
			'relationType',
		])
			->where([
				['ref', '=', $actionRef],
				['team_id', '=', $teamToJoin->id],
				['status', '=', 'pending'],
			])
			->first();

		$this->validatePendingJoinRequest($teamAction, $actionRef);
		$userToJoin = $teamAction->user;
		$this->validateTeamAuthority($teamAction->team);
		$teamAction->status = $status;
		$teamAction->save();
		$teamAction->user_ref = $teamAction->user->ref;
		$teamAction->team_ref = $teamAction->team->ref;
		$teamAction->requested = $teamAction->relationType->key;
		$teamAction->makeHidden('actionType');
		$teamAction->makeHidden('relationType');
		$userToJoinRelations = $this->getRelations($teamToJoin->ref, $userToJoin);
		$this->validateAlreadyTeamMember(
			$userToJoinRelations,
			$allowedRoles,
			$userToJoin,
			$teamToJoin
		);

		if ($status == 'approved') {
			$this->setRelation($teamToJoin, $userToJoin->identity, $teamAction->relationType);
		}

		return $teamAction;
	}

	public function getJoinRequests($team, $status)
	{
		$this->validateTeamAuthority($team);
		$user = Auth::user();
		$joinRequests = $this->getTeamActions($team, $user, 'join', $status);
		return $joinRequests;
	}

	public function inviteUsers($refOrHandle, $roleKey, $invitedUsers)
	{
		$this->validateRole($roleKey, ['admin', 'editor', 'member']);
		$team = $this->getTraditionalTeam(strtolower($refOrHandle));
		$this->validateInviteAuthority($team);
		return $this->saveInvites($invitedUsers, $team, $roleKey);
	}

	public function getInvitedUsers($payload)
	{
		$invitees = Commons::getProperty($payload, 'invitees');
		$this->validateInviteUsersPayload($invitees);

		$invitedUsers = [];

		foreach ($invitees as $invitee) {
			$user = $this->findUser($invitee);

			if (!empty($user)) {
				$invitedUsers[] = $user;
				continue;
			}

			/*
				The code below should only be triggered if $invitee is an email.
				This is due to the overloaded function findUserByEmail below where it doesn't throw an error when an email is a non-existing user in the app.
				This is contrary to the main function found in Controller class where it validates user existence and throws an error
			*/
			$invitedUsers[] = $invitee;
		}

		return $invitedUsers;
	}

	public function saveInvites($users, $team, $role = 'member')
	{
		$role = RelationType::where('key', '=', $role)->first();
		$actionType = ActionType::where('key', '=', 'invite')->first();
		$invitedUsers = [];
		$alreadyMemberUsers = [];
		$alreadyInvitedUsers = [];
		$invites = [];

		foreach ($users as $invitee) {
			// If $invitee is a valid email, it means that it's a non-existing/registered user from our app.
			if (filter_var($invitee, FILTER_VALIDATE_EMAIL)) {
				$this->sendInviteToNonRegisteredUser($invitee, $team);
				$invitedUsers[] = $invitee;
				continue;
			}

			$userRelations = $this->getRelations($team->ref, $invitee);

			if ($this->isTeamMember($userRelations)) {
				$alreadyMemberUsers[] = $invitee->email;
				continue;
			}

			/*
				Check whether a user already has a non-declined invite
				Non-declined because a user can be invited again if he/she has already declined an invite from the same team
			*/

			$inviteCheck = TeamAction::where([
				['user_id', '=', $invitee->id],
				['team_id', '=', $team->id],
				['action_type_id', '=', $actionType->id],
				['status', '!=', 'declined'],
			])->first();

			if (!empty($inviteCheck)) {
				$alreadyInvitedUsers[] = $invitee->email;
				continue;
			}

			$invite = [
				'ref' => StringHelper::readableRefGenerator($this->refLength, 'team_action', 'ref'),
				'user_id' => $invitee->id,
				'team_id' => $team->id,
				'action_type_id' => $actionType->id,
				'status' => 'pending',
				'relation_type_id' => $role->id,
			];

			TeamAction::insert($invite);
			$invites[] = $invite;
			$invitedUsers[] = $invitee->email;

			// Send an invite after saving...
			$this->sendInviteToRegisteredUser($invitee->email, $team);
		}

		return [
			'invitedUsers' => $invitedUsers,
			'alreadyMemberUsers' => $alreadyMemberUsers,
			'alreadyInvitedUsers' => $alreadyInvitedUsers,
			'invites' => $invites,
		];
	}

	public function getTraditionalTeam($refOrHandle)
	{
		$col = 'ref';

		if (strpos($refOrHandle, '@') === 0) {
			$col = 'handle';
			$refOrHandle = str_replace('@', '', $refOrHandle);
		}

		ValidationHelper::validateEntityExists($refOrHandle, 'team', $col);
		$team = Team::where($col, '=', $refOrHandle)
			->select('team.*', 'visibility.key as visibility')
			->join('visibility', 'visibility.id', 'team.visibility_id')
			->first();
		$team->makeHidden('visibility_id');
		$team->makeHidden('team_access_type_id');

		$ownerRelation = TeamUser::where([
			['team_id', '=', $team->id],
			['relation_type_id', '=', 2],
		])->first();
		$owner = User::where('id', '=', $ownerRelation->user_id)->first();

		if (empty($owner)) {
			ValidationHelper::fail(
				'Team not found',
				$this->errorCodes['exists'],
				'ref',
				__FILE__,
				__LINE__,
				['refOrHandle' => $refOrHandle]
			);
		}

		return $team;
	}

	public function processAvatar($entity, $payload)
	{
		$avatarField = array_get($payload, $this->avatarPayloadKey);
		$avatar = null;
		$base64String = null;

		// Ensures that the entity will have a avatar property
		$entity->avatar = $entity->avatar;

		// If both the uploaded image and base64 were not sent in the payload
		if (empty($avatarField)) {
			return $entity;
		}

		if (!is_string($avatarField)) {
			ValidationHelper::validateImage($this->avatarPayloadKey);
		} else {
			$base64String = $avatarField;
			ValidationHelper::validateBase64Image($base64String);
		}

		// Delete the entity's current avatar if it exists
		if (!empty($entity->avatar)) {
			$this->deleteAvatar($entity->avatar);
		}

		// Prioritize base64 over the file upload
		if (!empty($base64String)) {
			$imgInfo = $this->saveBase64AsImage($base64String);
			$avatar = FileHelper::saveFile($imgInfo, $this->fileRefLength);
		} elseif (!empty($avatarField)) {
			$avatar = $this->saveAvatar($avatarField);
		}

		if ($avatar) {
			$entity->avatar = $avatar->ref;
		}

		return $entity;
	}

	public function deleteInvites($users, $team)
	{
		$actionType = ActionType::where('key', '=', 'invite')->first();
		$invites = [];
		$invitedUsers = [];

		foreach ($users as $user) {
			$invite = [
				'user_id' => $user->id,
				'team_id' => $team->id,
				'action_type_id' => $actionType->id,
				'status' => 'pending',
			];

			TeamAction::where([
				['user_id', '=', $user->id],
				['team_id', '=', $team->id],
				['action_type_id', '=', $actionType->id],
			])->forceDelete();

			$invites[] = $invite;
			$invitedUsers[] = $user;
		}

		return [
			'invitedUsers' => $invitedUsers,
			'invites' => $invites,
		];
	}

	private function saveBase64AsImage($base64String, $imgPath = 'images')
	{
		// Convert the base 64 string into image and save the file in the correct storage location
		$dataComponents = explode(',', $base64String);
		$rawBase64 = array_pop($dataComponents);
		$imgdata = base64_decode($rawBase64);

		$infoResource = finfo_open();
		$mimeType = finfo_buffer($infoResource, $imgdata, FILEINFO_MIME_TYPE);

		$infoResource = finfo_open();
		$mimeType = finfo_buffer($infoResource, $imgdata, FILEINFO_MIME_TYPE);
		$ext = $this->getImageExt($mimeType);
		$fileName = StringHelper::randomHex(40) . '.' . $ext;
		$fileLoc = $imgPath . '/' . $fileName;
		Storage::put($fileLoc, $imgdata);
		finfo_close($infoResource); // close fileinfo resource

		// build and return img info
		return [
			'tempPath' => '',
			'originalName' => '',
			'path' => $fileLoc,
			'type' => $mimeType,
			'name' => $fileName,
			'ext' => $ext,
			'size' => Storage::size($fileLoc),
		];
	}

	private function getImageExt($mimeType)
	{
		$allowedImgExtensions = ['jpg', 'jpeg', 'png', 'gif'];

		foreach ($allowedImgExtensions as $ext) {
			if (strpos($mimeType, $ext) !== false) {
				return $ext;
			}
		}

		ValidationHelper::fail(
			'Invalid image extension',
			'invalid_image_ext',
			'image_data_url',
			__FILE__,
			__LINE__
		);
	}

	public function processAddRelations($teamRefOrHandle, $userRefOrHandle, $payload)
	{
		$currentUser = Auth::user();
		$team = $this->getTraditionalTeam($teamRefOrHandle);
		$userToAdd = $this->userService->findUser($userRefOrHandle);
		$relationsToAdd = Commons::getProperty($payload, 'relation');
		$currentUserRelations = TeamUser::getCurrentUserRelations($team->id);

		// Check the relations of the current user
		$authorizedRoles = ['owner', 'admin'];
		$teamAuthority = ValidationHelper::validateTeamAuthority(
			$currentUserRelations,
			$authorizedRoles
		);

		// Add all relations
		foreach ($relationsToAdd as $relation) {
			$role = RelationType::where('key', '=', $relation)->first();
			if ($relation == 'owner' && $teamAuthority['isOwner']) {
				// Pass the ownership of the team from the currentUser to the new
				TeamUser::where([
					['user_id', '=', $currentUser->user_id],
					['relation_type_id', '=', $role->id],
					['team_id', '=', $team->id],
				])->delete();
				$this->setRelation($team, $userToAdd, $role);
			} elseif ($teamAuthority['isOwner'] || $teamAuthority['isAdmin']) {
				$userToAddRelations = $this->setRelation($team, $userToAdd, $role);
			} else {
				ValidationHelper::fail(
					'You dont have access to this team',
					$this->errorCodes['team_access'],
					'',
					__FILE__,
					__LINE__,
					[
						'currentUser' => $currentUser,
						'currentUserRelations' => $currentUserRelations,
					]
				);
			}
		}

		$this->prepareTraditionalTeamResponse($team, $userToAdd);
		return $team;
	}

	public function processDeleteRelations($teamRefOrHandle, $userRefOrHandle, $payload)
	{
		// Init data
		$currentUser = Auth::user();
		$team = $this->getTraditionalTeam($teamRefOrHandle);
		$userToDelete = $this->userService->findUser($userRefOrHandle);
		$relationsToDelete = Commons::getProperty($payload, 'relation');
		$removedRelations = [];

		// Make sure that the person trying to delete the relations has the right team authority
		$authorizedRoles = ['owner', 'admin'];
		$currentUserRelations = TeamUser::getCurrentUserRelations($team->id);
		ValidationHelper::validateTeamAuthority($currentUserRelations, $authorizedRoles);

		// Delete relations
		$restrictedRoles = ['creator', 'owner', 'like'];
		foreach ($relationsToDelete as $key) {
			$this->restrictRoles($key, $restrictedRoles, $currentUserRelations);

			$role = RelationType::where('key', '=', $key)->first();
			$relation = TeamUser::where([
				['user_id', '=', $userToDelete->user_id],
				['relation_type_id', '=', $role->id],
				['team_id', '=', $team->id],
			]);

			if (!empty($relation->first())) {
				$relation->delete();
				array_push($removedRelations, $userToDelete);
			}
		}

		$this->prepareTraditionalTeamResponse($team, $userToDelete);
		return $team;
	}

	//todo: compare this to latest develop
	public function updateTeam($refOrHandle, $payload)
	{
		$team = $this->getTraditionalTeam($refOrHandle);
		$currentUser = Auth::user();
		$currentUserRelations = TeamUser::getCurrentUserRelations($team->id);

		// Check the relations of the current user
		$allowedRoles = ['owner', 'admin', 'editor'];
		$teamAuthority = ValidationHelper::validateTeamAuthority(
			$currentUserRelations,
			$allowedRoles
		);

		$this->restrictUpdateFields($payload, $currentUser, $teamAuthority);

		if ($teamAuthority['isEditor'] && isset($payload['description'])) {
			$team->description = Commons::getProperty($payload, 'description');
		}

		if ($teamAuthority['isOwner'] || $teamAuthority['isAdmin']) {
			if (isset($payload['city'])) {
				$team->city = Commons::getProperty($payload, 'city');
			}

			if (isset($payload['country'])) {
				$team->country = strtoupper(Commons::getProperty($payload, 'country'));
			}

			if (isset($payload['name'])) {
				$team->name = Commons::getProperty($payload, 'name');
			}

			if (isset($payload['handle'])) {
				$newHandle = Commons::getProperty($payload, 'handle');
				$this->validateTeamHandle($team, $newHandle, $payload);
				$team->handle = $newHandle;
			}

			if (isset($payload['description'])) {
				$team->description = Commons::getProperty($payload, 'description');
			}

			if (isset($payload['visibility'])) {
				$visibilityPayload = Commons::getProperty($payload, 'visibility');
				$visibility = Visibility::where('key', '=', $visibilityPayload)->first();
				$team->visibility_id = $visibility->id;
			}

			if (isset($payload['access'])) {
				$access = Commons::getProperty($payload, 'access');
				$accessType = TeamAccessType::where('key', '=', $access)->first();
				$team->team_access_type_id = $accessType->id;
			}
		}

		$team = $this->processAvatar($team, $payload);
		$team->save();
		$team->fresh();
		$this->prepareTraditionalTeamResponse($team, $currentUser);
		return $team;
	}

	public function updateMyTeamRelation($refOrHandle, $payload)
	{
		ValidationHelper::validatePayload($payload);
		$relation = Commons::getProperty($payload, 'relation');

		if (is_countable($payload) && count($payload) > 1 && empty($relation)) {
			ValidationHelper::fail(
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

		$currentUser = Auth::user();
		$allowedRoles = ['member', 'follow', 'like'];
		$this->validateRelationPayload($payload, $allowedRoles);

		$team = $this->getTraditionalTeam($refOrHandle);
		$relationsToUpdate = Commons::getProperty($payload, 'relation');

		foreach ($relationsToUpdate as $key) {
			$role = RelationType::where('key', '=', $key)->first();
			$this->setRelation($team, $currentUser, $role);
		}

		$this->prepareTraditionalTeamResponse($team, $currentUser);
	}

	public function validateRelationPayload(
		$payload,
		$allowedRoles = ['owner', 'admin', 'editor', 'member']
	) {
		ValidationHelper::validatePayload($payload);

		// Validate relation
		$relations = Commons::getProperty($payload, 'relation');

		// Relation should exists and must be an array of valid role refs
		if (empty($relations) || !is_array($relations)) {
			ValidationHelper::fail(
				'Relation is empty or invalid',
				$this->errorCodes['invalid_payload'],
				'relation',
				__FILE__,
				__LINE__,
				[]
			);
		}

		foreach ($relations as $relation) {
			if (!in_array($relation, $allowedRoles)) {
				ValidationHelper::fail(
					'Role is empty or invalid',
					$this->errorCodes['invalid_payload'],
					'relation',
					__FILE__,
					__LINE__,
					[]
				);
			}

			$role = RelationType::where('key', '=', $relation)->first();

			if (empty($role)) {
				ValidationHelper::fail(
					'Role is empty or invalid',
					$this->errorCodes['invalid_payload'],
					'relation',
					__FILE__,
					__LINE__,
					[]
				);
			}
		}
	}

	public function validateUpdateTeamPayload($payload)
	{
		ValidationHelper::validatePayload($payload);

		$visibility = Commons::getProperty($payload, 'visibility');
		$this->validateTeamVisibility($visibility);

		$access = Commons::getProperty($payload, 'access');
		$this->validateTeamAccessType($access);

		$rules = [
			'name' => 'string|max:255',
			'handle' => 'string|max:255|validHandle',
			'description' => Team::$rules['description'],
			'city' => Team::$rules['city'],
			'country' => Team::$rules['country'],
			'visibility' => 'string|exists:visibility,key',
		];

		$this->validateTeam($payload, $rules);
	}

	public function validateTeamPayload($payload)
	{
		ValidationHelper::validatePayload($payload);

		$visibility = Commons::getProperty($payload, 'visibility');
		$this->validateTeamVisibility($visibility);

		$access = Commons::getProperty($payload, 'access');
		$this->validateTeamAccessType($access);

		$rules = Team::$rules;
		unset($rules['ref']);

		$this->validateTeam($payload, $rules);
	}

	public function validateTeamVisibility($visibility)
	{
		// todo: consider validating from a config instead of DB to reduce DB query
		if (!empty($visibility)) {
			ValidationHelper::validateAccessType(
				$visibility,
				'visibility',
				'key',
				'Invalid team visibility.'
			);
		}
	}

	public function validateTeamAccessType($accessType)
	{
		// todo: consider validating from a config instead of DB to reduce DB query
		if (!empty($accessType)) {
			ValidationHelper::validateAccessType(
				$accessType,
				'team_access_type',
				'key',
				'Invalid team access type.'
			);
		}
	}

	public function sanitizeKeyword($keyword)
	{
		$keyword = strtolower(trim($keyword));
		$keyword = preg_replace('/[\x00-\x1F\x7F\xA0]/u', '', $keyword);
		return $keyword;
	}

	public function processSearch($keyword)
	{
		$currentUser = Auth::user();
		$this->validateSearchKeyWord($keyword);

		$this->searchResults = DB::table('team_user')
			->select(
				'team.*',
				'visibility.key as visibility',
				DB::raw('COUNT(' . DB_PREFIX . 'team_user.team_id) as relations')
			)
			->where(function ($query) {
				global $keyword;
				return $query
					->where('team.handle', 'like', "%{$keyword}%")
					->orWhere('team.name', 'like', "%{$keyword}%");
			})
			->where(function ($query) {
				#fixvisibility
				$visibility = Visibility::where('key', '=', 'public')->first();
				$currentUser = Auth::user();
				return $query->whereRaw(
					DB_PREFIX .
						'team_user.user_id=' .
						$currentUser->user_id .
						' OR ' .
						DB_PREFIX .
						'team.visibility_id=' .
						$visibility->id
				);
			})
			->join('team', 'team.id', '=', 'team_user.team_id')
			->join('visibility', 'visibility.id', '=', 'team.visibility_id')
			->whereNull('team.deleted_at')
			->groupBy('team.id')
			->get()
			->toArray();

		$this->userOwnedResults = true;

		return $this->sortAndOrganizeResults($keyword);
	}

	public function processTeamSearch($keyword)
	{
		$this->validateSearchKeyWord($keyword);
		#fixvisibility
		$this->searchResults = Team::getByKeywordAndVisibility($keyword, ['public', 'hidden']);
		return $this->sortAndOrganizeResults($keyword);
	}

	public function deleteTeams($teams)
	{
		Commons::deleteEntitiesWithRef(Team::class, $teams);
	}

	public function validateInviteAuthority($team, $authorizedRoles = ['owner', 'admin', 'editor'])
	{
		$currentUserRelations = TeamUser::getCurrentUserRelations($team->id);
		$teamAuthority = ValidationHelper::validateTeamAuthority(
			$currentUserRelations,
			$authorizedRoles
		);
	}

	public function validateTeamRefs($teamRefs, $user)
	{
		$teamRefs = Commons::getProperty($teamRefs, 'team_refs') ?: [];

		if (empty($teamRefs) && !is_array($teamRefs)) {
			ValidationHelper::fail(
				'Payload empty or invalid',
				$this->errorCodes['invalid_payload'],
				__FILE__,
				__LINE__,
				[
					'teamRefs' => $teamRefs,
				]
			);
		}

		foreach ($teamRefs as $teamRef) {
			ValidationHelper::validateEntityExists($teamRef, 'team', 'ref');
		}
	}

	public function getTeamByMoldAndMember($mold, $user, $teamType = 'division', $targetRoles = [])
	{
		$team = null;

		if (empty($mold) || empty($user)) {
			return $team;
		}

		$collectionTeams = $this->getTeamsByCollectionSubject($mold, $teamType);

		if (empty($collectionTeams)) {
			return $team;
		}

		$teamRoles = $this->divisionRoles;

		if (!empty($targetRoles)) {
			$teamRoles = $targetRoles;
		}

		$relationTypes = RelationType::whereIn('key', $teamRoles)->get();
		$relationTypesIds = $relationTypes->pluck('id')->toArray();

		// Loop through all the teams and check if the user is a member to one of these teams
		foreach ($collectionTeams as $collectionTeam) {
			$userRelations = $collectionTeam->relations
				->where('user_id', '=', $user->id)
				->whereIn('relation_type_id', $relationTypesIds)
				->toArray();

			// If the user is a [leader, guide, or member] of a team, immediately return that team.
			if (!empty($userRelations)) {
				return $collectionTeam;
			}
		}

		return $team;
	}

	public function getTeamsByCollectionSubject($subjectRef, $type = 'division')
	{
		$subject = Impression::where('ref', '=', $subjectRef)->first();

		if (empty($subject) || empty($subject->collectionImpressions->toArray())) {
			return;
		}

		/*
			As of 02/04/2020, the subject can only be assigned to a single collection, 
			collectionImpressions should only have one item, so get the first item.
			Note: Modify if the statement above changes in the future
		*/

		$collection = $subject->collectionImpressions[0]->collection;
		$collectionDivisionRelations = $collection->teamCollections->where('type', '=', $type);

		// Get all the divisions that the collection has a relation to
		$teams = $collectionDivisionRelations->map(function ($collectionRelation) {
			return $collectionRelation->team;
		});

		return $teams;
	}

	/**
	 * Validates the team (any type) and collection as well as their relationship.
	 *
	 * @return void
	 */
	public function validateTeamAndCollection(
		$teamRef,
		$collectionRef,
		$teamType = 'contest',
		$teamCollectionType = 'category'
	) {
		// Validate that the teamRef and collectionRef are valid and existing
		ValidationHelper::validateEntityExists($collectionRef, 'collection', 'ref');
		$team = $this->getTeamByRef($teamRef, $teamType);
		$collection = Collection::where('ref', '=', $collectionRef)->first();
		$this->validateTeamCollectionOwnership($team, $collection, $teamCollectionType);
	}

	/**
	 * Prepares the team response data and returns it
	 *
	 * @return $team
	 */
	public function prepareTraditionalTeamResponse($team, $user, $args = [])
	{
		$userRelations = $this->getRelations($team->ref, $user);
		$team->makeHidden(Team::$hidden_fields);
		$team->makeHidden('teamAccessType');
		$team['userRelations'] = array_merge([], $userRelations);
		$team['visibility'] = $team->visibility()->first()->key;
		$team['access'] = $team->teamAccessType()->first()->key;
		$team['type'] = $team->teamType()->first()->key;
		$isTeamAdminOrEditor =
			in_array('admin', $userRelations) || in_array('editor', $userRelations);

		// Prepare data for each members
		if (!empty($args['includeMembers'])) {
			$team['members'] = $this->getTeamMembers($team);
		}

		// Prepare hosted events by the team only if the user is an admin or editor
		if (!empty($args['includeHostedEvents']) && $isTeamAdminOrEditor) {
			$team['hosted_events'] = $this->collectionService->getTeamHostedCollections($team);
		}

		// Prepare user's that has requested to join the team only if the user is an admin or editor
		if (!empty($args['joinRequests']) && $isTeamAdminOrEditor) {
			$team['join_requests'] = $this->getTeamActions($team, $user, 'join', 'pending');
		}

		/*
			important!!!!
			todo: Optimize the SQL for the whole get team by ref - See if a single join query would work; If not do Eager Loading		
		*/

		return $team;
	}

	/**
	 * Gets the users that are a part of the team
	 *
	 * @return $members - array of App\Models\Users
	 */
	protected function getTeamMembers($team)
	{
		$members = TeamUser::getTeamRelationsWithUsers($team->id)->pluck('user');

		// Prepare data for each members
		return $members->map(function ($member) use ($team) {
			$memberRelations = $this->getRelations($team->ref, $member);
			$member['userRelations'] = array_merge([], $memberRelations);
			$member->makeHidden(['birth_date', 'gdpr_consent', 'created_at', 'updated_at']);
			return $member;
		});
	}

	/**
	 * Gets the teams related to the user
	 *
	 * @return $teams - array of App\Models\Teams
	 */
	protected function getUserTeams($userRef, $allowedRoles = ['owner'], $teamType = 'traditional')
	{
		$user = User::getUserByRef($userRef);
		$teams = Team::select(
			'team.*',
			'team_user.relation_type_id',
			'team_user.team_id',
			'team_user.user_id',
			'team_type.id',
			'team_type.key',
			'relation_type.key as role'
		)
			->join('team_user', 'team_user.team_id', 'team.id')
			->join('team_type', 'team_type.id', 'team.team_type_id')
			->join('relation_type', 'relation_type.id', 'team_user.relation_type_id')
			->where('team_user.user_id', $user->user_id)
			->where('team_type.key', $teamType)
			->whereIn('relation_type.key', $allowedRoles)
			->whereNull('team_user.deleted_at')
			->groupBy('team_id')
			->get();

		return $teams;
	}

	public function getCurrentUserTeams()
	{
		$currentUser = Auth::user();
		$teams = [];
		$allowedRelations = ['owner', 'admin', 'editor', 'member', 'follow'];
		$userTeams = $this->getUserTeams($currentUser->ref, $allowedRelations);
		$teamIds = $userTeams->pluck('team_id')->toArray();
		$teamsMembers = TeamUser::whereIn('team_id', $teamIds)->get();

		foreach ($userTeams as $userTeam) {
			$this->prepareTraditionalTeamResponse($userTeam, $currentUser);
			$userTeam['membersCount'] = $teamsMembers
				->where('team_id', $userTeam->team_id)
				->groupBy('user_id')
				->count();
			array_push($teams, $userTeam);
		}
		return $teams;
	}

	public function validateDeleteTeamPayload($payload, $user)
	{
		ValidationHelper::validatePayload($payload);
		$teamRefs = Commons::getProperty($payload, 'team_refs') ?: [];

		if (empty($teamRefs) && !is_array($teamRefs)) {
			ValidationHelper::fail(
				'Payload empty or invalid',
				$this->errorCodes['invalid_payload'],
				__FILE__,
				__LINE__,
				[
					'payload' => $payload,
				]
			);
		}

		foreach ($teamRefs as $teamRef) {
			ValidationHelper::validateEntityExists($teamRef, 'team', 'ref');
		}
	}

	protected function validateMetadata($metadata)
	{
		if (empty($metadata)) {
			ValidationHelper::fail(
				'Metadata is empty or invalid.',
				$this->errorCodes['invalid_payload'],
				'metadata',
				__FILE__,
				__LINE__,
				[
					'metadata' => $metadata,
				]
			);
		}

		$data = ['metadata' => $metadata];
		$rules = ['metadata' => TeamUser::$rules['metadata']];
		ValidationHelper::validateWithRules($data, $rules);
	}

	public function getPendingTeamActionByRelation($user, $team, $actionTypeKey, $relationTypeKey)
	{
		$actionType = ActionType::where('key', '=', $actionTypeKey)->first();
		$relationType = $this->getRelationType($relationTypeKey);
		$teamAction = TeamAction::where([
			['user_id', '=', $user->id],
			['team_id', '=', $team->id],
			['action_type_id', '=', $actionType->id],
			['relation_type_id', '=', $relationType->id],
			['status', '=', 'pending'],
		])->first();
		return $teamAction;
	}

	protected function getRole($roleKey)
	{
		$role = RelationType::where('key', $roleKey)->first();

		if (empty($role)) {
			ValidationHelper::fail(
				'Role [' . $roleKey . '] does not exist.',
				$this->errorCodes['exists'],
				'',
				__FILE__,
				__LINE__,
				[
					'role' => $roleKey,
				]
			);
		}

		return $role;
	}

	private function buildTeamStatement($statement)
	{
		return [
			'marked_impression' => $statement->marked_impression,
			'flag' => $statement->flag,
			'requested' => $statement->requested,
			'statement' => $statement->statement,
			'extra_a' => $statement->extra_a,
			'extra_b' => $statement->extra_b,
			'extra_c' => $statement->extra_c,
			'extra_d' => $statement->extra_d,
			'extra_e' => $statement->extra_e,
			'metadata' => $statement->metadata,
		];
	}

	private function buildTeamCollectionImpressions($team, $teamCollectionImpressions)
	{
		$subjectImpressions = [];

		if (empty($teamCollectionImpressions)) {
			return $subjectImpressions;
		}

		foreach ($teamCollectionImpressions as $impression) {
			$creator = User::getUserByRef($impression->owner_ref);

			// Check the impression owner relations and allowed roles if the team type is "contest"
			if ($team->teamType->key == 'contest') {
				$creatorRelations = $this->getRelations($team->ref, $creator);
				$allowedRoles = ['owner', 'admin'];

				if (!empty($creatorRelations)) {
					foreach ($creatorRelations as $relation) {
						if (in_array($relation, $allowedRoles)) {
							$creatorImpression = [
								'creator' => [
									'ref' => $creator->ref,
									'email' => $creator->email,
									'name' => $creator->name,
								],
								'data' => $this->impressionService->buildImpressionData(
									$impression
								),
							];
							array_push($subjectImpressions, $creatorImpression);
						}
					}
				}
				continue;
			}

			if ($team->id == $impression->team_id) {
				$creatorImpression = [
					'creator' => [
						'ref' => $creator->ref,
						'email' => $creator->email,
						'name' => $creator->name,
					],
					'data' => $this->impressionService->buildImpressionData($impression),
				];
				array_push($subjectImpressions, $creatorImpression);
			}
		}
		return $subjectImpressions;
	}

	public function setRelation($team, $user, $role)
	{
		$relation = TeamUser::where([
			['user_id', '=', $user->user_id],
			['relation_type_id', '=', $role->id],
			['team_id', '=', $team->id],
		])->first();

		if (empty($relation)) {
			$relation = new TeamUser();
			$relation->user_id = $user->user_id;
			$relation->relation_type_id = $role->id;
			$relation->team_id = $team->id;
			$relation->save();
		}

		return $relation;
	}

	private function prepareTeamActionResponse($teamAction, $team, $user, $relationType)
	{
		$teamAction['user_ref'] = $user->ref;
		$teamAction['team_ref'] = $team->ref;
		$teamAction['requested'] = $relationType->key;
		return $teamAction;
	}

	public function getRelations($teamref, $user)
	{
		$team = Team::where('ref', '=', $teamref)->first();

		$relations = TeamUser::where([
			['user_id', '=', $user->id],
			['team_id', '=', $team->id],
			['deleted_at', '=', null],
		])
			->groupBy('relation_type_id')
			->get();

		$roles = $this->getRolesFromRelations($relations);
		return $roles;
	}

	/*
		todo: merge getRelationsV2 to the original version getRelations
		find a way to decouple the team from the function to make lessen the call to the database
		in short, remove $team = Team::where('ref', '=', $teamref)->first(); from the original function and fix all affected codes
	*/
	public function getRelationsV2($team, $user)
	{
		$relations = TeamUser::where([['user_id', '=', $user->id], ['team_id', '=', $team->id]])
			->groupBy('relation_type_id')
			->get();
		return $this->getRolesFromRelations($relations);
	}

	protected function getRolesFromRelations($relations)
	{
		$teamRoles = [];

		foreach ($relations as $relation) {
			$key = $relation->relation_type->key;
			array_push($teamRoles, $key);
		}

		return $teamRoles;
	}

	private function saveAvatar($file)
	{
		$fileInfo = FileHelper::storeFile($file);
		$savedFile = FileHelper::saveFile($fileInfo, $this->fileRefLength);
		return $savedFile;
	}

	private function deleteAvatar($avatarRef)
	{
		if (!empty($avatarRef)) {
			$prevAvatar = File::where('ref', '=', $avatarRef)->first();
			if (!empty($prevAvatar)) {
				FileHelper::deleteFile($prevAvatar);
				$prevAvatar->delete();
			}
		}
	}

	protected function trimPayload($payload, $allowedFields)
	{
		ValidationHelper::validatePayload($payload);

		if (empty($allowedFields) || !is_array($allowedFields)) {
			ValidationHelper::fail(
				'Invalid allowedFields parameter',
				$this->errorCodes['valid_property'],
				'allowedFields',
				__FILE__,
				__LINE__
			);
		}

		$trimmedPayload = [];
		foreach ($allowedFields as $field) {
			$trimmedPayload[$field] = array_get($payload, $field);
		}

		return $trimmedPayload;
	}

	private function validateAlreadyRequestedToJoin($teamAction, $relationType, $user, $team)
	{
		if ($teamAction->relation_type_id == $relationType->id) {
			ValidationHelper::fail(
				'User has already sent a join request, please wait for admin\'s approval.',
				$this->errorCodes['team_already_join'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
					'team' => $team->ref,
				]
			);
		}
	}

	public function validateAlreadyTeamMember($userRelations, $allowedRoles, $user, $team)
	{
		if ($this->isTeamMember($userRelations, $allowedRoles)) {
			ValidationHelper::fail(
				'User is already part of this team.',
				$this->errorCodes['team_already_member'],
				'',
				__FILE__,
				__LINE__,
				[
					'user' => $user->ref,
					'team' => $team->ref,
					'current_roles' => $userRelations,
					'allowed_roles' => $allowedRoles,
				]
			);
		}
	}

	protected function isTeamMember(
		$userRelations,
		$allowedRoles = ['owner', 'admin', 'editor', 'member']
	) {
		if (empty($userRelations)) {
			return false;
		}

		foreach ($userRelations as $relation) {
			if (in_array($relation, $allowedRoles)) {
				return true;
			}
		}

		return false;
	}

	protected function validateContestCollectionPayload($payload)
	{
		// todo: See if this validation can be refactored into a collection service
		ValidationHelper::validatePayload($payload);

		$rules = [
			'name' => Collection::$rules['name'],
			'description' => Collection::$rules['description'],
			'start_date' => Collection::$rules['start_date'],
			'end_date' => Collection::$rules['end_date'],
			'theme' => Collection::$rules['theme'],
		];

		$data = Commons::prepareData($payload);
		ValidationHelper::validateWithRules($data, $rules);
	}

	protected function validateTeamStatementPayload($payload)
	{
		ValidationHelper::validatePayload($payload);
		ValidationHelper::validateWithRules($payload, TeamSubjectStatement::$rules);
	}

	/**
	 * Makes sure that the collection belongs to the team
	 *
	 * @return $teamCollectionRelation
	 */
	protected function validateTeamCollectionOwnership(
		$team,
		$collection,
		$teamCollectionType = 'category'
	) {
		$teamCollectionRelation = $this->getTeamCollection($team, $collection, $teamCollectionType);

		if (empty($teamCollectionRelation)) {
			ValidationHelper::fail(
				'Collection does not belong to the ' . ucfirst($team->teamType->key) . ' team.',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'team' => $team,
					'teamType' => $team->teamType->key,
					'collection' => $collection,
					'teamCollectionRelation' => $teamCollectionRelation,
				]
			);
		}
		return $teamCollectionRelation;
	}

	// todo: refactor later; possibly moving this function to the ImpressionService
	protected function validateImpressionSubject($impression, $subject)
	{
		// All fields optional - marked_impression
		if (empty($subject)) {
			return;
		}

		// But when filled, the subject should take after the impression, using it as mold
		if ($subject->mold != $impression->ref) {
			ValidationHelper::fail(
				'Subject [' . $subject->ref . '] has an invalid impression mold.',
				$this->errorCodes['invalid_payload'],
				'handle',
				__FILE__,
				__LINE__,
				[
					'impression' => $impression->ref,
					'subject' => $subject->ref,
				]
			);
		}
	}

	/**
	 * Makes sure that the collection is not yet owned by the team
	 *
	 * @return $teamCollectionRelation
	 */
	private function validateTeamCollectionAlreadyExists(
		$team,
		$collection,
		$teamCollectionType = 'category'
	) {
		$teamCollectionRelation = $this->getTeamCollection($team, $collection, $teamCollectionType);

		if (!empty($teamCollectionRelation)) {
			ValidationHelper::fail(
				'A relation between collection and team already exists.',
				$this->errorCodes['relation_exists'],
				'',
				__FILE__,
				__LINE__,
				[
					'team' => $team,
					'teamType' => $team->teamType->key,
					'collection' => $collection,
					'teamCollectionRelation' => $teamCollectionRelation,
				]
			);
		}
		return $teamCollectionRelation;
	}

	protected function validateRole(
		$roleKey,
		$allowedRoles = ['owner', 'admin', 'editor', 'member']
	) {
		if (!in_array($roleKey, $allowedRoles)) {
			ValidationHelper::fail(
				'Role [' . $roleKey . '] is invalid.',
				$this->errorCodes['team_invalid_role'],
				'',
				__FILE__,
				__LINE__,
				[
					'role' => $roleKey,
					'allowed_roles' => $allowedRoles,
				]
			);
		}
	}

	private function buildTeamSubjects($team, $collection)
	{
		$collectionImpressions = $this->collectionService->getCollectionImpressions($collection);
		$subjects = $collectionImpressions->map(function ($rawImpression) use ($team, $collection) {
			$rawStatement = $this->getTeamStatement($team, $collection, $rawImpression);
			$statement = $rawStatement ? $this->buildTeamStatement($rawStatement) : null;
			$teamCollectionImpressions = $this->collectionService->getMoldImpressions(
				$rawImpression->ref
			);

			return [
				'data' => $this->impressionService->buildImpressionData($rawImpression),
				'team_statement' => $statement,
				'impressions' => $this->buildTeamCollectionImpressions(
					$team,
					$teamCollectionImpressions
				),
			];
		});
		return $subjects;
	}

	protected function getTeamSubjects($collection)
	{
		$collectionImpressions = $this->collectionService->getCollectionImpressions($collection);
		$subjects = $collectionImpressions->map(function ($rawImpression) use ($collection) {
			return $this->impressionService->buildImpressionData($rawImpression);
		});
		return $subjects;
	}

	private function getTeamStatement($team, $collection, $impression)
	{
		$collectionImpression = CollectionImpression::where([
			['collection_id', $collection->id],
			['impression_id', $impression->id],
			['type', 'active'],
		])->first();

		if (empty($collectionImpression)) {
			return;
		}

		return TeamSubjectStatement::where([
			['team_id', $team->id],
			['collection_impression_id', $collectionImpression->id],
		])->first();
	}

	private function getTeamCollection($team, $collection, $teamCollectionType = 'category')
	{
		return $teamCollectionRelation = TeamCollection::where([
			['team_id', '=', $team->id],
			['collection_id', '=', $collection->id],
			['type', '=', $teamCollectionType],
		])->first();
	}

	private function validatePendingJoinRequest($teamAction, $actionRef)
	{
		if (empty($teamAction)) {
			ValidationHelper::fail(
				'User has no pending request(s) to join team.',
				$this->errorCodes['team_no_pending_join_request'],
				'',
				__FILE__,
				__LINE__,
				[
					'action_ref' => $actionRef,
				]
			);
		}

		if ($teamAction->actionType->key != 'join') {
			ValidationHelper::fail(
				'Team action not permitted.',
				$this->errorCodes['team_invalid_action'],
				'',
				__FILE__,
				__LINE__,
				[
					'action_ref' => $actionRef,
				]
			);
		}
	}

	private function validateHandle($teamHandle)
	{
		// A handle must have an '@' symbol in the beginning
		if (empty($teamHandle)) {
			ValidationHelper::fail(
				'Invalid handle.',
				$this->errorCodes['exists'],
				'handle',
				__FILE__,
				__LINE__,
				[
					'handle' => $teamHandle,
				]
			);
		}
	}

	private function validateHasPendingJoinTeamRequest(
		$pendingAdminJoinRequests,
		$pendingParticipantJoinRequests,
		$userRef,
		$teamRef,
		$type
	) {
		if (empty($pendingAdminJoinRequests) && empty($pendingParticipantJoinRequests)) {
			ValidationHelper::fail(
				"User has no pending {$type} join request.",
				$this->errorCodes['exists'],
				'handle',
				__FILE__,
				__LINE__,
				[
					'user' => $userRef,
					$type => $teamRef,
				]
			);
		}

		// Join Requests should only generate one request
		if (!empty($pendingAdminJoinRequests) && !empty($pendingParticipantJoinRequests)) {
			ValidationHelper::fail(
				'An unexpected error occured.',
				$this->errorCodes['unexpected'],
				'handle',
				__FILE__,
				__LINE__,
				[
					'user' => $userRef,
					$type => $teamRef,
					'adminRequests' => $pendingAdminJoinRequests,
					'participantRequests' => $pendingParticipantJoinRequests,
				]
			);
		}
	}

	private function getTeamActions($team, $user, $type, $status)
	{
		$actionType = ActionType::where('key', '=', $type)->first();
		$with = ['team', 'user', 'actionType', 'relationType'];
		$currentTeamType = $team->teamType->key;

		if ($currentTeamType === 'contest') {
			array_push($with, 'user.identity');
		}

		$joinRequests = TeamAction::with($with)
			->where([
				['team_id', '=', $team->id],
				['action_type_id', '=', $actionType->id],
				['status', '=', $status],
			])
			->orderBy('id', 'desc')
			->groupBy('user_id')
			->get();

		foreach ($joinRequests as $request) {
			if ($currentTeamType === 'contest') {
				$request->user->email = $request->user->identity->email;
			}

			$request->status = $request->status;
			$request->role = $request->relationType->key;
			$request->team->makeHidden(['city', 'country', 'created_at', 'updated_at']);
			$request->user->makeHidden([
				'gdpr_consent',
				'birth_date',
				'created_at',
				'updated_at',
				'identity',
			]);
		}

		return $joinRequests;
	}

	private function validateInviteUsersPayload($invitees)
	{
		$data = [
			'invitees' => $invitees,
		];

		$rules = [
			'invitees' => 'required|array|max:10',
		];

		$inviteesValidator = Validator::make($data, $rules, $this->ruleMessages);
		ValidationHelper::checkValidatorForErrors($inviteesValidator);
	}

	private function findUser($refOrHandleOrEmail)
	{
		$atPosition = strpos($refOrHandleOrEmail, '@');

		if (0 < $atPosition) {
			return $this->findUserByEmail($refOrHandleOrEmail);
		}

		return $this->userService->findUser($refOrHandleOrEmail);
	}

	private function findUserByEmail($email)
	{
		//Override UserService->findUserByEmail so it won't fail when the email is not an existing user from our app
		$this->validateEmail($email);
		$user = Identity::getByEmail($email);
		return $user;
	}

	private function validateEmail($email)
	{
		$data = [
			'email' => $email,
		];

		$rules = [
			'email' => 'required|email|max:255',
		];

		$emailValidator = Validator::make($data, $rules, $this->ruleMessages);
		ValidationHelper::checkValidatorForErrors($emailValidator);
	}

	private function sendInviteToNonRegisteredUser($to_email, $team)
	{
		sleep(1);
		$inviter = Auth::user(); //the current-user is the inviter
		$this->mailService->send($this->inviteNonRegisteredUserTemplate, [
			$to_email,
			$team,
			$inviter,
		]);
	}

	private function sendInviteToRegisteredUser($to_email, $team)
	{
		sleep(1);
		$inviter = Auth::user(); //the current-user is the inviter
		$this->mailService->send($this->inviteRegisteredUserTemplate, [$to_email, $team, $inviter]);
	}

	private function restrictRoles($role, $restrictedRoles, $currentUserRelations)
	{
		if (in_array($role, $restrictedRoles)) {
			ValidationHelper::fail(
				'You dont have access to delete this relation',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				[
					'currentUser' => $currentUser,
					'currentUserRelations' => $currentUserRelations,
				]
			);
		}
	}

	private function restrictUpdateFields($payload, $currentUser, $teamAuthority)
	{
		$isAuthorized = $teamAuthority['isOwner'] || $teamAuthority['isAdmin'];
		$authorizedOnlyFields = ['name', 'handle', 'visibility', 'avatar', 'city', 'country'];
		$fieldsToUpdate = array_keys($payload);

		foreach ($fieldsToUpdate as $field) {
			if (!$isAuthorized && in_array($field, $authorizedOnlyFields)) {
				ValidationHelper::fail(
					"You're not allowed to edit the field",
					$this->errorCodes['invalid_access'],
					'',
					__FILE__,
					__LINE__,
					[
						'currentUser' => $currentUser,
						'payload' => $payload,
					]
				);
			}
		}
	}

	private function validateTeamHandle($team, $newHandle, $payload)
	{
		$claimedHandleTeam = Team::where('handle', '=', $newHandle)->first();
		if (!empty($claimedHandleTeam)) {
			if ($claimedHandleTeam->ref != $team->ref) {
				ValidationHelper::fail(
					'Handle is already taken.',
					$this->errorCodes['validhandle'],
					'handle',
					__FILE__,
					__LINE__,
					[
						'payload' => $payload,
					]
				);
			}
		}
	}

	private function validateTeam($payload, $rules = null)
	{
		if (empty($rules)) {
			$rules = Team::$rules;
		}

		// Validate Team fields
		$teamValidator = Validator::make($payload, $rules, $this->ruleMessages);
		ValidationHelper::checkValidatorForErrors($teamValidator);
	}

	private function validateSearchKeyWord($keyword)
	{
		if (empty($keyword)) {
			ValidationHelper::fail(
				'Search keyword is empty or invalid',
				$this->errorCodes['valid_search_key'],
				'search_key',
				__FILE__,
				__LINE__
			);
		}

		$keyWordValidator = Validator::make(
			['keyword' => $keyword],
			['keyword' => 'required|string|max:128'],
			$this->ruleMessages
		);

		ValidationHelper::checkValidatorForErrors($keyWordValidator);
	}

	private function sortAndOrganizeResults($keyword)
	{
		#fixvisibility
		// To only include hidden results when an exact handle match triggers contest/2106
		$this->hiddenVisibility = Visibility::where('key', 'hidden')->first();

		// Organize and merge based on priority. Check core-252 for details
		$teamsWithExactHandleMatch = $this->getTeamsWithExactHandleMatch($keyword);
		$teamsWithExactNameMatch = $this->getTeamsWithExactNameMatch($keyword);
		$teamsThatStartsWithHandle = $this->getTeamsThatStartsWithHandle($keyword);
		$teamsThatStartsWithName = $this->getTeamsThatStartsWithName($keyword);
		$teamsThatIncludesHandle = $this->getTeamsThatIncludesHandle($keyword);
		$teamsThatIncludesName = $this->getTeamsThatIncludesName($keyword);

		$finalResults = array_merge(
			$teamsWithExactHandleMatch,
			$teamsWithExactNameMatch,
			$teamsThatStartsWithHandle,
			$teamsThatStartsWithName,
			$teamsThatIncludesHandle,
			$teamsThatIncludesName
		);

		// Return 'hidden' first contest/2106
		$finalResults = $this->sortByVisibility($finalResults);

		return $this->cleanUpFinalSearchResults($finalResults);
	}

	private function getTeamsWithExactHandleMatch($keyword)
	{
		return $this->findExactMatch('handle', $keyword);
	}

	private function getTeamsWithExactNameMatch($keyword)
	{
		return $this->findExactMatch('name', $keyword);
	}

	private function getTeamsThatStartsWithHandle($keyword)
	{
		return $this->findStartingWordMatch('handle', $keyword);
	}

	private function getTeamsThatStartsWithName($keyword)
	{
		return $this->findStartingWordMatch('name', $keyword);
	}

	private function getTeamsThatIncludesHandle($keyword)
	{
		return $this->findIncludingWordMatch('handle', $keyword);
	}

	private function getTeamsThatIncludesName($keyword)
	{
		return $this->findIncludingWordMatch('name', $keyword);
	}

	private function sortByVisibility($teams)
	{
		usort($teams, function ($a, $b) {
			return $a->visibility_id < $b->visibility_id;
		});
		return $teams;
	}

	private function cleanUpFinalSearchResults($teams)
	{
		foreach ($teams as $team) {
			unset($team->id);
			unset($team->parent_id);
			unset($team->team_type_id);
			unset($team->team_access_type_id);
			unset($team->visibility_id);
			unset($team->deleted_at);
			unset($team->relations);
		}
		return $teams;
	}

	private function findExactMatch($prop, $keyword)
	{
		$results = [];
		foreach ($this->searchResults as $key => $team) {
			if (strtolower($team->$prop) === $keyword) {
				$override = $prop == 'handle';
				$this->addSearchResultItem($results, $team, $key, $override);
			}
		}
		$this->sortByRelations($results);
		return $results;
	}

	private function findIncludingWordMatch($prop, $keyword)
	{
		$results = [];
		foreach ($this->searchResults as $key => $team) {
			$pos = strpos(strtolower($team->$prop), $keyword);
			if ($pos > 0) {
				$this->addSearchResultItem($results, $team, $key);
			}
		}
		return $this->sortByRelations($results);
	}

	private function findStartingWordMatch($prop, $keyword)
	{
		$results = [];
		foreach ($this->searchResults as $key => $team) {
			$pos = strpos(strtolower($team->$prop), $keyword);
			if ($pos === 0) {
				$this->addSearchResultItem($results, $team, $key);
			}
		}
		return $this->sortByRelations($results);
	}

	private function addSearchResultItem(&$results, &$team, $key, $override = false)
	{
		#fixvisibility
		$hidden = $team->visibility_id == $this->hiddenVisibility->id;
		$owned = $this->userOwnedResults;

		if (!$override) {
			if ($hidden && !$owned) {
				unset($this->searchResults[$key]);
				return;
			}
		}

		array_push($results, $team);
		unset($this->searchResults[$key]);
	}

	private function sortByRelations($teams)
	{
		usort($teams, function ($a, $b) {
			return $a->relations < $b->relations;
		});
		return $teams;
	}

	public function copyTeamRequestAndInvites($sourceTeam, $targetTeam, $roleKey)
	{
		// Get all the pending join requests and invites of the source team
		$sourceRequestsAndInvites = $this->getPendingTeamActionsByRole($sourceTeam, $roleKey);

		// Get all the pending join requests and invites of the source team
		$targetRequestsAndInvites = $this->getPendingTeamActionsByRole($targetTeam, $roleKey);

		$requestsAndInvitesToCopy = $sourceRequestsAndInvites->whereNotIn(
			'user_id',
			$targetRequestsAndInvites->pluck('user_id')
		);

		// Copy the requests and invites to the target team
		$copiedData = [];
		foreach ($requestsAndInvitesToCopy as $source) {
			$action = new TeamAction();
			$action->ref = StringHelper::readableRefGenerator(
				$this->refLength,
				'team_action',
				'ref'
			);
			$action->user_id = $source->user_id;
			$action->action_type_id = $source->action_type_id;
			$action->status = $source->status;
			$action->created_at = Carbon::now();
			$action->updated_at = Carbon::now();
			$action->relation_type_id = $source->relation_type_id;
			array_push($copiedData, $action);
		}

		$targetTeam->actions()->saveMany($copiedData);

		return [
			'copiedRequestsAndInvites' => count($copiedData),
		];
	}

	private function getPendingTeamActionsByRole($team, $roleKey)
	{
		return TeamAction::with('actionType', 'relationType')
			->where('team_id', $team->id)
			->where('status', 'pending')
			->get()
			->filter(function ($source) use ($roleKey) {
				return in_array($source->actionType->key, ['join', 'invite']) &&
					$source->relationType->key == $roleKey;
			});
	}

	protected function copyTeamUsers($sourceContest, $targetContest, $roleKey)
	{
		$role = $this->getRole($roleKey);

		// Consider owner as an admin from source, but don't give the user an owner role in the target contest.
		$roleKeys[] = $roleKey;
		if ($roleKey == 'admin') {
			$roleKeys[] = 'owner';
		}

		// Get initial source contest users
		$sourceContestMembers = $this->getContestUsersAndRelationsByRoles(
			$sourceContest,
			$roleKeys
		);

		// Get all target contest users with all possible contest roles
		$targetContestMembers = $this->getContestUsersAndRelationsByRoles(
			$targetContest,
			$this->contestRoles
		);

		// If the user already has a relation to the target contest they will not be copied.
		$sourceContestMembers = $sourceContestMembers->whereNotIn(
			'user_id',
			$targetContestMembers->pluck('user_id')
		);

		// Copy Users
		$copiedUsers = [];
		foreach ($sourceContestMembers as $member) {
			$teamUser = new TeamUser();
			$teamUser->user_id = $member->user_id;
			$teamUser->team_id = $targetContest->id;
			$teamUser->relation_type_id = $role->id;
			array_push($copiedUsers, $teamUser);
		}

		// Execute Participant Copy
		$targetContest->relations()->saveMany($copiedUsers);

		// Copy TeamActions
		$sourceTeamActions = TeamAction::where([
			['team_id', $sourceContest->id],
			['relation_type_id', $role->id],
			['status', 'pending'],
		])
			->whereNotIn('user_id', $targetContestMembers->pluck('user_id'))
			->get();

		// Check if source users has any existing request on the destination contest (please do not add relation_type_id in where clause)
		$targetTeamActions = TeamAction::where([
			['team_id', $targetContest->id],
			['status', 'pending'],
		])->get();
		$sourceTeamActions->whereNotIn('user_id', $targetTeamActions->pluck('user_id'));

		$copiedRequests = [];
		foreach ($sourceTeamActions as $teamAction) {
			$clonedTeamAction = new TeamAction();

			// Original ref can't be retained due to unique attribute
			$clonedTeamAction->ref = StringHelper::readableRefGenerator(
				$this->refLength,
				'team_action',
				'ref'
			);

			$clonedTeamAction->team_id = $teamAction->team_id;
			$clonedTeamAction->user_id = $teamAction->user_id;
			$clonedTeamAction->action_type_id = $teamAction->action_type_id;
			$clonedTeamAction->relation_type_id = $teamAction->relation_type_id;
			$clonedTeamAction->status = $teamAction->status;
			array_push($copiedRequests, $clonedTeamAction);
		}

		// Execute Requests Copy
		$targetContest->teamActions()->saveMany($copiedRequests);

		return [
			'users' => count($copiedUsers),
			'requests' => count($copiedRequests),
		];
	}

	private function getContestUsersAndRelationsByRoles($contest, $roles)
	{
		$relationTypeIds = RelationType::whereIn('key', $roles)
			->get()
			->pluck('id');

		return $contest->relations->whereIn('relation_type_id', $relationTypeIds);
	}

	protected function validateTeamTransferRoles($roleKey)
	{
		// Consider owner as an admin from source, but don't give the user an owner role in the target contest.
		$allowedRoles = ['admin', 'participant'];
		if (!in_array($roleKey, $allowedRoles)) {
			ValidationHelper::fail(
				'Role [' . $roleKey . '] is not an allowed user role for copying contest users.',
				$this->errorCodes['team_invalid_role'],
				'',
				__FILE__,
				__LINE__,
				[
					'role' => $roleKey,
				]
			);
		}
	}

	protected function validateSameTeamCopy($sourceRef, $targetRef)
	{
		if ($targetRef == $sourceRef) {
			ValidationHelper::fail(
				'The source and target teams must not be the same.',
				$this->errorCodes['team_invalid_copy'],
				'',
				__FILE__,
				__LINE__,
				[
					'source_ref' => $sourceRef,
					'target_ref' => $targetRef,
				]
			);
		}
	}
}
