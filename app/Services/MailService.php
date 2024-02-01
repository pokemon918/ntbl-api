<?php
namespace App\Services;

use Illuminate\Support\Facades\Mail;
use App\Mail\ResetPassword;
use App\Mail\InviteRegisteredUserToTeam;
use App\Mail\InviteNonRegisteredUserToTeam;

class MailService
{
	function __construct()
	{
		/*
			What is mailWhenDev ?
			- During unit tests on pipelines, the unit tests sends the mails too fast. Mailtrap has throttling check in place and will
			result in a failed pipeline.

			What is mailWhenDevForce
			- This overrides the setting above , and the mailtrap domain check. Useful if you want to retain a 'DEV' environment and still
			be able to use real smtp accounts.
		*/

		$this->mailHost = config('app.mail.host');
		$this->mailWhenDev = config('app.mail.mailWhenDev', false);
		$this->mailWhenDevForce = config('app.mail.mailWhenDevForce', false);
	}

	public function send($template, $params)
	{
		$mailClass = new \ReflectionClass('App\Mail\\' . $template);
		$mailInstance = $mailClass->newInstance(...$params);
		$this->handleSendingEnvironment($mailInstance);
	}

	protected function handleSendingEnvironment($mailInstance)
	{
		if (PROD) {
			Mail::send($mailInstance);
		}

		if (DEV) {
			if ($this->mailWhenDevForce) {
				Mail::send($mailInstance);
			} else {
				if ($this->mailWhenDev && $this->mailHost === 'smtp.mailtrap.io') {
					Mail::send($mailInstance);
				}
			}
		}
	}
}
