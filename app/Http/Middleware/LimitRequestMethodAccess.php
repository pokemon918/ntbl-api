<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class LimitRequestMethodAccess
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
		if (!in_array($request->method(), ['POST', 'GET', 'DELETE', 'OPTIONS'])) {
			$currentUser = Auth::user();
			Log::warning('Invalid request method detected.', [
				'user_id' => $currentUser->id,
				'method' => $request->method(),
			]);
			return response()->json(['message' => 'No Access'], Response::HTTP_FORBIDDEN);
		}

		return $next($request);
	}
}
