<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class AdminOnly
{
	/**
	 * Handle an incoming request.
	 *
	 * @param  \Illuminate\Http\Request  $request
	 * @param  \Closure  $next
	 * @return mixed
	 */
	public function handle($request, Closure $next)
	{
		$currentUser = Auth::user();
		$userBadges = $currentUser->userBadges()->get();
		$isAdmin = false;

		foreach ($userBadges as $userBadge) {
			$badge = $userBadge->badge()->first()->key;
			if ($badge === 'developer' || $badge === 'admin' || $badge === 'super_admin') {
				$isAdmin = true;
			}
		}

		if (!$isAdmin) {
			$currentUser = Auth::user();
			Log::warning('Access to an ADMIN only feature has been detected', [
				'user_id' => $currentUser->id,
			]);
			return response()->json(['message' => 'No Access'], Response::HTTP_FORBIDDEN);
		}

		return $next($request);
	}
}
