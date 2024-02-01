<?php
namespace App\Services;

use Auth;
use App\Helpers\Commons;
use App\Helpers\LogHelper;
use App\Helpers\ValidationHelper;
use App\Services\UserService;
use DrewM\MailChimp\MailChimp;

class MailChimpService
{
	private $errorMessage = '';
	private $responseData = [];

	function __construct()
	{
		$this->errorCodes = config('app.errorCodes');
		$this->userService = new UserService();
		$this->mailChimpApiKey = config('app.mailChimp.apiKey');
		$this->mailChimpListId = config('app.mailChimp.listId');
	}

	public function getMailChimp($request, $user, $graceful = false)
	{
		try {
			return new MailChimp($this->mailChimpApiKey);
		} catch (Exception $e) {
			if (!$graceful) {
				// Triggering a fail will automatically Log the error
				if (empty($mailChimp)) {
					ValidationHelper::fail(
						$e->getMessage(),
						$this->errorCodes['mailchimp'],
						'MAILCHIMP_API_KEY',
						__FILE__,
						__LINE__,
						[
							'payload' => $request->post(),
							'user' => $user->ref,
						]
					);
				}
			} else {
				LogHelper::HttpLog500(
					$request->url(),
					$e->getMessage(),
					$request->post(),
					$user->ref
				);
			}
		}
		return null;
	}

	public function subscribeMember($mailChimp, $user, $graceful = false)
	{
		$payload = $this->prepareMemberData($user);

		// Check if already subscribed
		$member = $this->getMember($mailChimp, $user->email);
		$addedBeforeStatus = ['subscribed', 'unsubscribed', 'pending', 'cleaned'];

		if (in_array($member['status'], $addedBeforeStatus)) {
			$result = $this->updateMember($mailChimp, $member, $payload);
		} else {
			$result = $this->addMember($mailChimp, $payload);
		}

		$this->validateMailChimpResponse($mailChimp, $result, $payload, $user, $graceful);
		return $result;
	}

	public function addTag($mailChimp, $tag)
	{
		if (empty($tag) || strlen($tag) <= 0) {
			return;
		}

		$endpoint = "lists/{$this->mailChimpListId}/segments";

		// We dont care about the response
		$mailChimp->post($endpoint, [
			'name' => $tag,
			'static_segment' => [],
		]);
	}

	public function getMember($mailChimp, $email)
	{
		$subscriber_hash = MailChimp::subscriberHash($email);
		$endpoint = "lists/{$this->mailChimpListId}/members/$subscriber_hash";
		$result = $mailChimp->get($endpoint);
		return $result;
	}

	public function buildMemberData($result)
	{
		$memberData = [
			'email' => Commons::getProperty($result, 'email_address'),
			'status' => Commons::getProperty($result, 'status'),
			'merge_fields' => Commons::getProperty($result, 'merge_fields'),
			'tags' => Commons::getProperty($result, 'tags'),
			'timestamp_signup' => Commons::getProperty($result, 'timestamp_signup'),
			'timestamp_opt' => Commons::getProperty($result, 'timestamp_opt'),
			'last_changed' => Commons::getProperty($result, 'last_changed'),
		];
		return $memberData;
	}

	protected function addMember($mailChimp, $payload)
	{
		$mailChimp = new MailChimp($this->mailChimpApiKey);
		$endpoint = "lists/{$this->mailChimpListId}/members";
		$result = $mailChimp->post($endpoint, $payload);
		return $result;
	}

	protected function updateMember($mailChimp, $member, $payload)
	{
		$email = Commons::getProperty($payload, 'email_address');
		$subscriber_hash = MailChimp::subscriberHash($email);
		$endpoint = "lists/{$this->mailChimpListId}/members/$subscriber_hash";

		// Set/Assign the tag to the user
		$this->setMemberTag($mailChimp, $member, $payload);

		// Update the user's data
		$result = $mailChimp->patch($endpoint, $payload);

		return $result;
	}

	protected function setMemberTag($mailChimp, $member, $payload)
	{
		if (empty($payload['tags'])) {
			return;
		}

		$email = Commons::getProperty($payload, 'email_address');
		$subscriber_hash = MailChimp::subscriberHash($email);
		$endpoint = "lists/{$this->mailChimpListId}/members/{$subscriber_hash}/tags";

		// Prepare the new tag and set it to active
		$tags = [
			[
				'name' => $payload['tags'][0],
				'status' => 'active',
			],
		];

		// Set the old tag to inactive
		if (!empty($member['tags'])) {
			foreach ($member['tags'] as $tag) {
				array_push($tags, [
					'name' => $tag['name'],
					'status' => 'inactive',
				]);
			}
		}

		return $mailChimp->post($endpoint, [
			'tags' => $tags,
		]);
	}

	protected function prepareMemberData($user)
	{
		$subscription = $this->userService->getPlan($user);

		$tags = [];
		if (!empty($subscription->voucher)) {
			$tags[] = $subscription->voucher->code;
		}

		$payload = [
			'email_address' => $user->email,
			'status' => 'subscribed',
			'tags' => $tags,
			'merge_fields' => [
				'FNAME' => $user->name,
				//'USER_REF' => $user->ref,
			],
		];
		return $payload;
	}

	/*
		Check and return for any errors. In case of permanently deleted contact in a list (audience),
		or if an email tried to sign up many times and was marked with a 'compliance' status,
		The only way to get back to the list is if that user re-subscribes through an embedded mailchimp
		form. There are cases that it takes an hour to 24 days before a subscribed user appears in a list.
	*/
	protected function validateMailChimpResponse(
		$mailChimp,
		$result,
		$payload,
		$user,
		$graceful = false
	) {
		if (!$mailChimp->success()) {
			// Triggering a fail will automatically Log the error
			if (!$graceful) {
				ValidationHelper::fail(
					$mailChimp->getLastError(),
					$this->errorCodes['mailchimp'],
					'',
					__FILE__,
					__LINE__,
					[
						'mailChimpPayload' => $payload,
						'mailChimpResponse' => $result,
					]
				);
			} else {
				$errorPayload['mailChimpPayload'] = $payload;
				$errorPayload['mailChimpResponse'] = $result;
				LogHelper::HttpLog400(
					request()->url(),
					$mailChimp->getLastError(),
					$errorPayload,
					$user->ref
				);
			}
		}
	}
}
