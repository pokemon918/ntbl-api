<?php
namespace App\Http\Controllers;

use Auth;
use DB;
use Exception;
use Carbon\Carbon;
use App\Models\CollectionFeatured;
use App\Models\Identity;
use App\Models\Impression;
use App\Models\User;
use App\Models\UserEducation;
use App\Services\MailChimpService;
use App\Services\UserService;
use App\Services\SubscriptionService;
use App\Helpers\Commons;
use App\Helpers\LogHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UserController extends Controller
{
	const MODEL = 'App\Models\Identity';

	private $errorType = 'user';

	public function __construct()
	{
		parent::__construct();
		$this->avatarPayloadKey = 'avatar';
		$this->userService = new UserService();
		$this->subscriptionService = new SubscriptionService();
		$this->mailChimpService = new MailChimpService();
		$this->mailOnSignup = config('app.mail.mailOnSignup', false);
		$this->defaultUrl = config('frontend.default_url', 'https://noteable.co');
		$this->autoSubscribe = config('app.mailChimp.autoSubscribe');
		$this->middleware('devAccessOnly', ['only' => ['getRawIdentity']]);
	}

	public function getIdentity($refOrHandleOrEmail)
	{
		try {
			return $this->userService->getUserInfo($refOrHandleOrEmail);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getMyData()
	{
		try {
			$currentUser = Auth::user();
			return $this->userService->getUserInfo($currentUser->ref);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getRawIdentity($refOrHandle)
	{
		try {
			$this->devAccessOnly();
			return $this->userService->getRawIdentityByRef(strtolower($refOrHandle));
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getUserSpecs(Request $request)
	{
		try {
			$params = $request->query();
			return $this->userService->getSpecsByEmail(array_get($params, 'email'));
		} catch (Exception $e) {
			return $this->error($e, $this->errorType, Response::HTTP_UNAUTHORIZED);
		}
	}

	public function add(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());

			$voucher = strtoupper(Commons::getProperty($payload, 'voucher'));

			// api/2431 : friendly vouchers
			$voucher = preg_replace(config('regex.friendly_voucher_code'), '', $voucher);
			$voucher = strtoupper($voucher);

			$this->subscriptionService->validateVoucher($voucher);

			$user = $this->userService->createUser($payload);
			$specs = $this->userService->getSpecsByEmail($user->email);
			$subscription = $this->subscriptionService->addSignupSubscription($user, $voucher);

			$user = $this->userService->refresh($user);
			$user = $this->userService->sanitizeProfileData($user);

			$userData = $user;
			$userData['specs'] = [
				'salt' => $specs->salt,
				'iterations' => $specs->iterations,
			];

			if ($this->mailOnSignup) {
				try {
					$clientHost = Commons::getProperty($payload, 'client_host', $this->defaultUrl);
					$this->userService->sendUserSignup($user, $clientHost);
				} catch (Exception $e) {
					LogHelper::HttpLog400($request->url(), $e->getMessage(), $payload, $userRef);
					if (DEV) {
						$this->fail(
							'Error sending welcome mail.',
							$this->errorCodes['mail_error'],
							'client_host',
							__FILE__,
							__LINE__,
							$user->ref
						);
					}
				}
			}

			if ($this->autoSubscribe) {
				$mailChimp = $this->mailChimpService->getMailChimp($request, $user, true);

				if (!empty($mailChimp)) {
					$result = $this->mailChimpService->subscribeMember($mailChimp, $user, true);
					$memberData = $this->mailChimpService->buildMemberData($result);
				}
			}

			return $this->success('User created!', Response::HTTP_CREATED, $userData);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function deactivate(Request $request)
	{
		try {
			$currentUser = Auth::user();
			$deactivatedUser = $this->userService->deactivateUser($currentUser);

			return $this->success('User deactivated!', Response::HTTP_ACCEPTED, [
				'user_ref' => $deactivatedUser->ref,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function deactivateMultipleUsers(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$users = Commons::getProperty($payload, 'users', []);
			$this->userService->deactivateMultipleUsers($users);
			return $this->success('Users deactivated!', Response::HTTP_ACCEPTED, [
				'users' => $users,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function changePassword(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$this->userService->updatePassword($payload);

			return $this->success('Password changed!');
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function resetPassword(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$userEmail = Commons::getProperty($payload, 'email');
			$resetToken = Commons::getProperty($payload, 'resetToken');

			$this->userService->validateResetPasswordPayload($userEmail, $resetToken, $payload);

			/*
				Note: If user email is present and resetToken is not, 
				it means that the user is requesting for a password reset.				
			*/
			if (!empty($userEmail) && empty($resetToken)) {
				$clientHost = Commons::getProperty($payload, 'client_host');
				$responseData = $this->userService->sendUserResetToken($userEmail, $clientHost);
				// todo: create logging mechanism later
				return $this->success(
					'If the email is registered, we have now sent you a link to reset your password',
					Response::HTTP_OK,
					$responseData
				);
			}

			/*
				Note: If resetToken is present and user email is not, 
				it means that the user is requesting for a password reset.
			*/
			if (!empty($resetToken) && empty($userEmail)) {
				$user = $this->userService->useResetToken($resetToken, $payload);
				$responceData = [];
				$responseData['salt'] = $user->identity->salt;
				$responseData['iterations'] = $user->identity->iterations;
				$responseData['ref'] = $user->ref;
				$responseData['email'] = $user->identity->email;

				// todo: create logging mechanism later
				return $this->success(
					'Successfully used reset token!',
					Response::HTTP_OK,
					$responseData
				);
			}
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getUserProfile(Request $request)
	{
		try {
			$user = Auth::user();
			$user = $this->userService->refresh($user);
			return $this->userService->sanitizeProfileData($user);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getPlan(Request $request)
	{
		try {
			$user = Auth::user();
			return $this->userService->getPlan($user);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function listUserTitles(Request $request)
	{
		try {
			return $this->userService->getUserTitles();
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function updateUserProfile(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$payload = $this->setFilePayloadKey($request, $payload, $this->avatarPayloadKey);
			$user = Auth::user();
			$user = $this->userService->saveUserData($user, $payload);
			return $this->success('User updated!', Response::HTTP_OK, [
				'user' => $this->userService->sanitizeProfileData($user),
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getCounts(Request $request)
	{
		try {
			$user = Auth::user();
			$impressionCount = Impression::where('owner_ref', $user->ref)->count();
			$featuredCollectionsCount = CollectionFeatured::count();
			return [
				'impressions' => $impressionCount,
				'featured_events' => $featuredCollectionsCount,
			];
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function removeEducations(Request $request)
	{
		try {
			$payload = $request->post();
			$educationRefsDB = $this->userService->deleteUserEducations($payload);

			return $this->respond(Response::HTTP_OK, [
				'status' => 'success',
				'message' => 'Successfully deleted the education(s)',
				'data' => [
					'deleted_educations' => $educationRefsDB,
				],
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function removeInterests(Request $request)
	{
		try {
			$payload = $request->post();
			$interestRefsDB = $this->userService->deleteUserInterestRelations($payload);

			return $this->respond(Response::HTTP_OK, [
				'status' => 'success',
				'message' => 'Successfully deleted the interest(s)',
				'data' => [
					'deleted_interests' => $interestRefsDB,
				],
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getPendingTeamJoinRequests(Request $request)
	{
		try {
			$currentUser = Auth::user();
			return $this->userService->getPendingTeamJoinRequests($currentUser);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getPendingTeamInvites(Request $request)
	{
		try {
			$currentUser = Auth::user();
			return $this->userService->getPendingTeamInvites($currentUser);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function acceptTeamInvite($actionRef, Request $request)
	{
		try {
			$currentUser = Auth::user();
			$inviteResult = $this->userService->acceptTeamInvite($actionRef, $currentUser);

			return $this->respond(Response::HTTP_OK, [
				'status' => 'success',
				'message' => 'Successfully accepted the team invitation',
				'data' => $inviteResult,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}
}
