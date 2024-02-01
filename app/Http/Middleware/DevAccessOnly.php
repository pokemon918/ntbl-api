<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class DevAccessOnly
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
		if (!DEV) {
			$currentUser = Auth::user();
			Log::warning('Access to a DEV only feature has been detected', [
				'user_id' => $currentUser->id,
			]);
			return response()->json(['message' => 'No Access'], Response::HTTP_FORBIDDEN);
		}

		return $next($request);
	}
}
