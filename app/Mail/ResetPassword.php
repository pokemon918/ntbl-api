<?php
namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResetPassword extends Mailable
{
	use Queueable, SerializesModels;

	protected $title;
	protected $toAddress;
	protected $resetToken;

	public function __construct($toAddress, $resetToken, $clientHost)
	{
		$this->title = config('mailtemplate.titles.resetpassword', 'Reset Password');
		$this->toAddress = $toAddress;
		$this->resetTokenUrl =
			$clientHost .
			str_replace(
				'$token',
				$resetToken,
				config('frontend.pages.reset_token', '/reset?token=$token')
			);
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
			->view('emails.reset-password')
			->with([
				'title' => $this->title,
				'email' => $this->toAddress,
				'resetTokenUrl' => $this->resetTokenUrl,
			]);
	}
}
