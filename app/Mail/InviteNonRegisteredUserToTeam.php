<?php
namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class InviteNonRegisteredUserToTeam extends Mailable
{
	use Queueable, SerializesModels;

	protected $toAddress;
	protected $team;
	protected $inviter;

	public function __construct($toAddress, $team, $inviter)
	{
		$this->toAddress = $toAddress;
		$this->team = $team;
		$this->inviter = $inviter;
	}

	/**
	 * Build the message.
	 *
	 * @return $this
	 */
	public function build()
	{
		$webAppUrl = (strpos(request()->getSchemeAndHttpHost(), 'localhost') !== false
				? 'http://localhost'
				: !empty(request()->getSchemeAndHttpHost()))
			? request()->getScheme() . '://' . request()->getHost()
			: 'https://noteable.co';

		$teamAcceptUrl =
			$webAppUrl .
			str_replace(
				'$teamRef',
				$this->team->ref,
				config('frontend.pages.team_invite', '/team-invitation/$teamRef')
			) .
			'?non-user=true';

		return $this->to($this->toAddress)
			->subject('Team Invitation')
			->view('emails.invite-non-registered-user-to-team')
			->with([
				'teamAcceptUrl' => $teamAcceptUrl,
				'team' => $this->team,
				'inviter' => $this->inviter,
			]);
	}
}
