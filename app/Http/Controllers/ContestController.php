<?php
namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\InviteRegisteredUserToTeam;
use App\Mail\InviteNonRegisteredUserToTeam;
use App\Models\ActionType;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\TeamAction;
use App\Models\Identity;
use App\Models\RelationType;
use App\Models\User;
use App\Services\ContestService;
use App\Services\CollectionService;
use App\Services\MailService;
use App\Helpers\StringHelper;
use App\Helpers\ValidationHelper;
use App\Helpers\Commons;
use App\Helpers\FileHelper;

class ContestController extends TeamController
{
	const MODEL = 'App\Models\Team';
	private $errorType = 'contest';

	public function __construct()
	{
		parent::__construct();
		$this->avatarPayloadKey = 'avatar';
		$this->contestService = new ContestService();
		$this->collectionService = new CollectionService();
	}

	public function add(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$payload = $this->setFilePayloadKey($request, $payload, $this->avatarPayloadKey);
			$contestTeam = $this->contestService->createContestTeam($payload);
			return $this->success('Contest created!', Response::HTTP_CREATED, $contestTeam);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addDivisionTeam($contestRef, Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$team = $this->contestService->createDivisionTeam($contestRef, $payload);
			return $this->success('Division team created!', Response::HTTP_CREATED, $team);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function removeDivisionTeam($contestRef, $teamRef, Request $request)
	{
		try {
			$this->contestService->deleteDivisionTeam($contestRef, $teamRef);
			return $this->success('Division team deleted!', Response::HTTP_ACCEPTED, []);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addCollection($contestRef, Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$collection = $this->contestService->createContestCollection($contestRef, $payload);
			return $this->success(
				'Contest collection created!',
				Response::HTTP_CREATED,
				$collection
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function removeCollection($contestRef, $collectionRef, Request $request)
	{
		try {
			$this->contestService->removeContestCollection($contestRef, $collectionRef);
			return $this->success('Contest collection removed!', Response::HTTP_OK, []);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getByRef($contestRef)
	{
		try {
			$contestData = $this->contestService->getContestDataFromRef($contestRef);
			return $this->success('Contest found', Response::HTTP_OK, $contestData);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function requestToJoinContest($contestRef, $type)
	{
		try {
			$user = Auth::user();
			$contest = $this->contestService->getTeamByRef(strtolower($contestRef), 'contest');
			$joinRequest = $this->contestService->saveJoinContestTeamRequest(
				$user,
				$contest,
				$type
			);

			return $this->success(
				'Request to join sent! Please wait for the contest team admin\'s approval.',
				Response::HTTP_OK,
				$joinRequest
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function inviteUsersToContest($contestRef, $type, Request $request)
	{
		try {
			$invitedUsers = $this->contestService->getInvitedUsers($request->post());
			$invites = $this->contestService->inviteUsersToContest(
				$contestRef,
				strtolower($type),
				$invitedUsers
			);

			return $this->success('Successfully invited users!', Response::HTTP_OK, [
				'invited_users' => $invites['invitedUsers'],
				'already_member_users' => $invites['alreadyMemberUsers'],
				'already_invited_users' => $invites['alreadyInvitedUsers'],
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function assignParticipantToDivision($contestRef, $userRef, $divisionRef)
	{
		try {
			$this->contestService->assignParticipantToDivisionTeam(
				$contestRef,
				$userRef,
				$divisionRef
			);

			return $this->success('User assigned to division team!', Response::HTTP_OK, []);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function removeParticipantFromDivision($contestRef, $userRef, $divisionRef)
	{
		try {
			$this->contestService->removeParticipantFromDivisionTeam(
				$contestRef,
				$userRef,
				$divisionRef
			);
			return $this->success('User removed from division team!', Response::HTTP_OK, []);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function assignParticipantRole($contestRef, $userRef, $roleKey)
	{
		try {
			$this->contestService->assignParticipantRole($contestRef, $userRef, $roleKey);
			return $this->success('Participant role assigned!', Response::HTTP_OK, []);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function importMyContestImpressions($contestRef, $collectionRef, Request $request)
	{
		try {
			// Make sure that the current user is the owner of the contest
			$contest = $this->contestService->getTeamByRef($contestRef, 'contest');
			$this->contestService->validateTeamAuthority($contest, ['owner']);
			$importedImpressions = $this->importImpressions($contestRef, $collectionRef, $request);
			return $this->success('Contest impressions imported!', Response::HTTP_OK, [
				'impressions' => $importedImpressions,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	// todo: refactor this later, possibly remove the validateTeamAndCollection and move the importImpressions to contest service
	public function adminImportImpressions($contestRef, $collectionRef, Request $request)
	{
		try {
			// todo: there should be a validation that the currently loggedin user is a site admin
			$this->contestService->validateTeamAndCollection($contestRef, $collectionRef);
			$importedImpressions = $this->importImpressions($contestRef, $collectionRef, $request);

			return $this->success('Contest impressions imported!', Response::HTTP_OK, [
				'impressions' => $importedImpressions,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	private function importImpressions($contestRef, $collectionRef, $request)
	{
		$this->contestService->validateTeamAndCollection($contestRef, $collectionRef);

		if (!empty($request->get('payload'))) {
			$payload = $request->get('payload');
			$importData = json_decode($payload, true);
		} else {
			$filePayloadKey = 'uploadedFile';
			$this->collectionService->validateCollectionImportData($collectionRef, $filePayloadKey);
			$payload = $request->file($filePayloadKey);
			$importData = FileHelper::parseJsonFile($payload);
		}

		if ('true' === $request->get('archive')) {
			// Archive all existing collection impression before importing
			$this->collectionService->archiveCollectionImpressions($collectionRef);
		}

		$importedImpressions = $this->collectionService->importCollectionImpressions(
			$collectionRef,
			$importData
		);

		return $importedImpressions;
	}

	public function assignCollectionToDivision($contestRef, $collectionRef, $divisionRef)
	{
		try {
			$this->contestService->assignCollectionToDivision(
				$contestRef,
				$collectionRef,
				$divisionRef
			);
			return $this->success('Collection assigned to division team!', Response::HTTP_OK, []);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function removeCollectionFromDivision($contestRef, $collectionRef, $divisionRef)
	{
		try {
			$this->contestService->removeCollectionFromDivision(
				$contestRef,
				$collectionRef,
				$divisionRef
			);
			return $this->success('Collection removed from division team!', Response::HTTP_OK, []);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addOrUpdateContestStatement(
		$contestRef,
		$collectionRef,
		$impressionRef,
		Request $request
	) {
		try {
			$user = Auth::user();
			$payload = Commons::prepareData($request->post());
			$statement = $this->contestService->addOrUpdateContestStatement(
				$user,
				$contestRef,
				$collectionRef,
				$impressionRef,
				$payload
			);
			return $this->success('Contest statement saved!', Response::HTTP_OK, $statement);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addOrUpdateDivisionStatement(
		$contestRef,
		$collectionRef,
		$divisionRef,
		$impressionRef,
		Request $request
	) {
		try {
			$payload = Commons::prepareData($request->post());
			$statement = $this->contestService->addOrUpdateDivisionStatement(
				$contestRef,
				$collectionRef,
				$divisionRef,
				$impressionRef,
				$payload
			);
			return $this->success('Division statement saved!', Response::HTTP_OK, $statement);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getContestProgress($contestRef)
	{
		try {
			$contestProgress = $this->contestService->getContestProgress($contestRef);
			return $this->success('Contest progress found.', Response::HTTP_OK, $contestProgress);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getDivisionProgress($contestRef, $divisionRef)
	{
		try {
			//$divisionProgress = $this->contestService->getDivisionProgress($contestRef, $divisionRef);
			$divisionProgress = $this->contestService->getDivisionProgressV2(
				$contestRef,
				$divisionRef
			);
			return $this->success('Progress identified', Response::HTTP_OK, $divisionProgress);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getContestStats($contestRef, $collectionRef, Request $request)
	{
		try {
			$onlymolds = $request->get('onlymolds');
			$teamStats = $this->contestService->getContestStats(
				$contestRef,
				$collectionRef,
				$onlymolds
			);
			return $this->success('Contest stats found.', Response::HTTP_OK, $teamStats);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getTeamStats($contestRef, $collectionRef, $divisionRef)
	{
		try {
			$teamStats = $this->contestService->getTeamStats(
				$contestRef,
				$collectionRef,
				$divisionRef
			);
			return $this->success('Contest division stats found.', Response::HTTP_OK, $teamStats);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addUserMetadata($contestRef, $userRef, Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$user = $this->contestService->addUserMetadataForContest(
				$contestRef,
				$userRef,
				$payload
			);
			return $this->success(
				'User[' . $userRef . ']\'s metadata updated for contest[' . $contestRef . '].',
				Response::HTTP_CREATED,
				$user
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	// todo: add a unit test for this API
	public function getUserMetadata($contestRef, $userRef)
	{
		try {
			$metadata = $this->contestService->getUserMetadataForContest($contestRef, $userRef);
			return $this->success(
				'Contest user metadata found.',
				Response::HTTP_CREATED,
				$metadata
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function searchByHandle($contestHandle)
	{
		try {
			$contest = $this->contestService->searchByHandle($contestHandle, 'contest');
			$msg = 'Contest found.';

			if (empty($contest)) {
				$msg = 'No contest found.';
			}

			return $this->success($msg, Response::HTTP_OK, $contest);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function acceptAllRequests($contestRef, $userRef, Request $request)
	{
		try {
			$this->contestService->acceptAllRequests($contestRef, $userRef);
			return $this->success(
				'All requests by User[' . $userRef . '] approved for contest[' . $contestRef . '].',
				Response::HTTP_CREATED,
				[]
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getStatementSummary($contestRef)
	{
		try {
			$statementSummary = $this->contestService->getStatementSummary($contestRef);
			return $this->success('Statement summary found.', Response::HTTP_OK, $statementSummary);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getStatementSummaryV2($contestRef, $teamRef)
	{
		try {
			$statementSummary = $this->contestService->getStatementSummaryV2($contestRef, $teamRef);
			return $this->success('Statement summary found.', Response::HTTP_OK, $statementSummary);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function copyParticipants($targetRef, $sourceRef, $roleKey)
	{
		try {
			$copiedData = $this->contestService->copyParticipants($targetRef, $sourceRef, $roleKey);
			return $this->success(
				ucfirst($roleKey) .
					's from contest [' .
					$sourceRef .
					'] copied to contest [' .
					$targetRef .
					'].',
				Response::HTTP_OK,
				$copiedData
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function copyRequestsAndInvites($targetRef, $sourceRef, $roleKey)
	{
		try {
			$copiedData = $this->contestService->copyRequestsAndInvites(
				$targetRef,
				$sourceRef,
				$roleKey
			);
			return $this->success(
				'Requests and invites from contest [' .
					$sourceRef .
					'] copied to contest [' .
					$targetRef .
					'].',
				Response::HTTP_OK,
				$copiedData
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function exportContestResults($contestRef)
	{
		try {
			$exportData = $this->contestService->getContestExportData($contestRef);
			return $this->success('Contest export data found.', Response::HTTP_OK, $exportData);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function resetDivisionMembers($contestRef)
	{
		try {
			$this->contestService->resetDivisionMembers($contestRef);
			return $this->success(
				"Successfully reset the members for contest - [{$contestRef}].",
				Response::HTTP_OK
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}
}
