<?php
namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class Signup extends Mailable
{
	use Queueable, SerializesModels;

	protected $title;
	protected $toAddress;
	protected $userFullName;
	protected $loginUrl;

	public function __construct($toAddress, $userFullName, $clientHost)
	{
		$this->title = config('mailtemplate.titles.signup', 'Welcome to Noteable!');
		$this->toAddress = $toAddress;
		$this->userFullName = $userFullName;
		$this->loginUrl = $clientHost . config('frontend.pages.sign_in', '/sign-in');
	}

	/**
	 * Build the message.
	 *
	 * @return $this
	 */
	public function build()
	{
		return $this->to($this->toAddress)
			->subject($this->title)
			->view('emails.user-signup')
			->with([
				'title' => $this->title,
				'email' => $this->toAddress,
				'userFullName' => $this->userFullName,
				'loginUrl' => $this->loginUrl,
			]);
	}
}
