<?php
namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use App\Models\Feedback;
use App\Helpers\ValidationHelper;
use App\Helpers\Commons;

class FeedbackController extends Controller
{
	const MODEL = 'App\Models\Feedback';

	private $errorType = 'feedback';

	public function __construct()
	{
		parent::__construct();
	}

	public function add(Request $request)
	{
		try {
			// Validate the payload
			$payload = Commons::prepareData($request->post());
			$this->validateFeedbackPayload($payload);

			// Create the feedback
			$feedback = $this->createFeedback($payload);

			return $this->success('Feedback sent!', Response::HTTP_OK, [
				'feedback' => $feedback,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	private function createFeedback($payload)
	{
		$feedback = new Feedback();
		$feedback->name = $payload['name'];
		$feedback->email = $payload['email'];
		$feedback->message = $payload['message'];
		$feedback->save();
		return [
			'name' => $feedback->name,
			'email' => $feedback->email,
			'message' => $feedback->message,
		];
	}

	private function validateFeedbackPayload($payload)
	{
		ValidationHelper::validatePayload($payload);
		$this->validateFeedback($payload);
	}

	private function validateFeedback($payload, $rules = null)
	{
		if (empty($rules)) {
			$rules = Feedback::$rules;
		}

		// Validate Feedback fields
		$feedbackValidator = Validator::make($payload, $rules, $this->ruleMessages);
		$this->checkValidatorForErrors($feedbackValidator);
	}
}
