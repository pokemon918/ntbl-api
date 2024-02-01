<?php
namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Services\MailChimpService;
use App\Traits\RESTActions;

class NewsletterController extends Controller
{
	const MODEL = 'App\Models\User';
	use RESTActions;

	private $errorType = 'newsletter';

	public function __construct()
	{
		parent::__construct();
		$this->refLength = config('app.impression.refLength');
		$this->refMaxLength = config('app.identity.refMaxLength');
		$this->mailChimpService = new MailChimpService();
	}

	public function getDetails(Request $request)
	{
		try {
			$user = Auth::user();
			$mailChimp = $this->mailChimpService->getMailChimp($request, $user);
			$result = $this->mailChimpService->getMember($mailChimp, $user->email);
			$memberData = $this->mailChimpService->buildMemberData($result);

			return $memberData;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function subscribe(Request $request)
	{
		try {
			$user = Auth::user();
			$mailChimp = $this->mailChimpService->getMailChimp($request, $user);
			$result = $this->mailChimpService->subscribeMember($mailChimp, $user, true);
			$memberData = $this->mailChimpService->buildMemberData($result);

			return $this->success(
				'NTBL User subscribed to Mailchimp!',
				Response::HTTP_OK,
				$memberData
			);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}
}
