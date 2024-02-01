<?php
namespace App\Http\Controllers;

use App\Helpers\ValidationHelper;
use App\Helpers\Commons;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\Visibility;
use App\Models\RelationType;
use App\Services\TeamService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;

class TeamController extends Controller
{
	const MODEL = 'App\Models\Team';
	private $errorType = 'team';

	public function __construct()
	{
		parent::__construct();
		$this->avatarPayloadKey = 'avatar';
		$this->teamService = new TeamService();
	}

	public function add(Request $request)
	{
		try {
			// Prepare and validate the payload
			$currentUser = Auth::user();
			$payload = Commons::prepareData($request->post());
			$payload = $this->setFilePayloadKey($request, $payload, $this->avatarPayloadKey);
			$this->teamService->validateTeamPayload($payload);

			// Create the team
			$team = $this->teamService->createTeam($payload);
			return $this->success(
				'Team created!',
				Response::HTTP_CREATED,
				$this->teamService->prepareTraditionalTeamResponse($team, $currentUser)
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function updateByRefOrHandle($refOrHandle, Request $request)
	{
		try {
			$currentUser = Auth::user();
			$payload = Commons::prepareData($request->post());
			$payload = $this->setFilePayloadKey($request, $payload, $this->avatarPayloadKey);

			$relation = Commons::getProperty($payload, 'relation');
			if (!empty($relation)) {
				$results = $this->teamService->updateMyTeamRelation($refOrHandle, $payload);
				return $this->success('Relation updated!', Response::HTTP_OK, $results);
			}

			$this->teamService->validateUpdateTeamPayload($payload);
			$team = $this->teamService->updateTeam($refOrHandle, $payload);

			return $this->success(
				'Team updated!',
				Response::HTTP_OK,
				$this->teamService->prepareTraditionalTeamResponse($team, $currentUser)
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
			$teams = null;
			$payload = Commons::prepareData($request->post());

			$this->teamService->validateDeleteTeamPayload($payload, $currentUser);
			$teamRefs = Commons::getProperty($payload, 'team_refs');
			$this->teams = Team::whereIn('ref', $teamRefs)->get();
			$allowedRoles = ['owner'];
			foreach ($this->teams as $team) {
				$currentUserRelations = TeamUser::getCurrentUserRelations($team->id);
				ValidationHelper::validateTeamAuthority($currentUserRelations, $allowedRoles);
			}
			$this->teamService->deleteTeams($this->teams);

			return $this->success('Team(s) deleted!', Response::HTTP_ACCEPTED, [
				'team_refs' => $this->teams->pluck('ref'),
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function deleteInvitedUsers($refOrHandle, Request $request)
	{
		try {
			$team = $this->teamService->getTraditionalTeam(strtolower($refOrHandle));
			$invitedUsers = $this->teamService->getInvitedUsers($request->post());
			$deletedInvites = $this->teamService->deleteInvites($invitedUsers, $team);

			return $this->success('Successfully deleted user invites!', Response::HTTP_OK, [
				'deletedInviteUsers' => Arr::pluck($deletedInvites['invitedUsers'], 'ref'),
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function inviteUsers($refOrHandle, $type, Request $request)
	{
		try {
			$invitedUsers = $this->teamService->getInvitedUsers($request->post());
			$invites = $this->teamService->inviteUsers($refOrHandle, $type, $invitedUsers);
			return $this->success('Successfully invited users!', Response::HTTP_OK, [
				'invited_users' => $invites['invitedUsers'],
				'already_member_users' => $invites['alreadyMemberUsers'],
				'already_invited_users' => $invites['alreadyInvitedUsers'],
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addRelations($teamRefOrHandle, $userRefOrHandle, Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$this->teamService->validateRelationPayload($payload);
			$team = $this->teamService->processAddRelations(
				$teamRefOrHandle,
				$userRefOrHandle,
				$payload
			);

			return $this->success('Relations created!', Response::HTTP_CREATED, [
				'teamRef' => strtolower($teamRefOrHandle),
				'userRef' => strtolower($userRefOrHandle),
				'userRelations' => $team->userRelations,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function deleteRelations($teamRefOrHandle, $userRefOrHandle, Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$allowedRoles = ['admin', 'editor', 'member', 'follow'];
			$this->teamService->validateRelationPayload($payload, $allowedRoles);
			$team = $this->teamService->processDeleteRelations(
				$teamRefOrHandle,
				$userRefOrHandle,
				$payload
			);

			return $this->success('Relations removed!', Response::HTTP_ACCEPTED, [
				'teamRef' => $teamRefOrHandle,
				'userRef' => $userRefOrHandle,
				'userRelations' => $team->userRelations,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getMyTeams()
	{
		try {
			return $this->teamService->getCurrentUserTeams();
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getTeams()
	{
		try {
			$visibilityKey = 'public';
			$this->teamService->validateTeamVisibility($visibilityKey);
			return Team::getByVisibility(['public']);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getByRefOrHandle($refOrHandle)
	{
		try {
			$currentUser = Auth::user();
			$team = $this->teamService->getTraditionalTeam(strtolower($refOrHandle));
			$visibility = Visibility::where('id', $team->visibility_id)->first();

			if ($visibility->key == 'public') {
				return $this->teamService->prepareTraditionalTeamResponse($team, $currentUser, [
					'includeMembers' => true,
					'includeHostedEvents' => true,
					'joinRequests' => true,
				]);
			}

			$currentUserRelations = TeamUser::getCurrentUserRelations($team->id);

			// Check the relations of the current user
			ValidationHelper::validateTeamAuthority($currentUserRelations, [
				'owner',
				'admin',
				'editor',
				'member',
			]);

			return $this->teamService->prepareTraditionalTeamResponse($team, $currentUser, [
				'includeMembers' => true,
				'includeHostedEvents' => true,
				'joinRequests' => true,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function searchTeams($keyword)
	{
		try {
			$keyword = $this->teamService->sanitizeKeyword($keyword);
			return $this->teamService->processTeamSearch($keyword);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function searchMyTeams($keyword)
	{
		try {
			$keyword = $this->teamService->sanitizeKeyword($keyword);
			return $this->teamService->processSearch($keyword);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getRequestsToJoinTeam($teamRefOrHandle)
	{
		try {
			$user = Auth::user();
			$team = $this->teamService->getTraditionalTeam(strtolower($teamRefOrHandle));
			$joinRequests = $this->teamService->getJoinRequests($team, 'pending');

			return $joinRequests;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function requestToJoinTeam($teamRefOrHandle)
	{
		try {
			$user = Auth::user();
			$team = $this->teamService->getTraditionalTeam(strtolower($teamRefOrHandle));
			$joinRequest = $this->teamService->saveJoinRequest($user, $team, 'member');

			return $this->success(
				'Request to join sent! Please wait for the team admin\'s approval.',
				Response::HTTP_OK,
				$joinRequest
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function acceptRequestToJoinTeam($teamRefOrHandle, $actionRef)
	{
		try {
			ValidationHelper::validateEntityExists($actionRef, 'team_action', 'ref');
			$teamToJoin = $this->teamService->getTraditionalTeam($teamRefOrHandle);
			$teamAction = $this->teamService->processJoinRequest(
				$teamToJoin,
				$actionRef,
				'approved'
			);

			return $this->success(
				'Request to join team has been approved!',
				Response::HTTP_OK,
				$teamAction
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function declineRequestToJoinTeam($teamRefOrHandle, $actionRef)
	{
		try {
			ValidationHelper::validateEntityExists($actionRef, 'team_action', 'ref');
			$teamToJoin = $this->teamService->getTraditionalTeam($teamRefOrHandle);
			$teamAction = $this->teamService->processJoinRequest(
				$teamToJoin,
				$actionRef,
				'declined'
			);

			return $this->success(
				'Request to join team has been declined!',
				Response::HTTP_OK,
				$teamAction
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}
}
