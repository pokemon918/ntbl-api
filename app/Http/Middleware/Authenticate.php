<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Auth\Factory as Auth;
use Base32\Base32;
use App\Helpers\AuthHelper;

class Authenticate
{
	/**
	 * The authentication guard factory instance.
	 *
	 * @var \Illuminate\Contracts\Auth\Factory
	 */
	protected $auth;

	/**
	 * Create a new middleware instance.
	 *
	 * @param  \Illuminate\Contracts\Auth\Factory  $auth
	 * @return void
	 */
	public function __construct(Auth $auth)
	{
		$this->auth = $auth;
	}

	/**
	 * Handle an incoming request.
	 *
	 * @param  \Illuminate\Http\Request  $request
	 * @param  \Closure  $next
	 * @param  string|null  $guard
	 * @return mixed
	 */
	public function handle($request, Closure $next, $guard = null)
	{
		if ($this->auth->guard($guard)->guest()) {
			Log::info('Unauthorized access detected');
			return response()->json(
				[
					'message' => 'Unauthorized',
					'errorCode' => 401,
				],
				Response::HTTP_UNAUTHORIZED
			);
		}

		$who = $request->get('who');

		if (!empty($who)) {
			if (AuthHelper::isDevRef($who)) {
				return $next($request);
			}

			// Make sure that $who can only be used once s
			if (AuthHelper::requestUsedMoreThanOnce($who)) {
				return response('Precondition Failed.', 412);
			}

			if (!IS_WHITELISTED) {
				$throttleResults = AuthHelper::throttleUserRequest($who);
				$throttleLimit = intval(config('app.throttleLimit', 30));
				if ($throttleResults > $throttleLimit) {
					return response('Too Many Requests.', 429);
				}
			}
		}

		return $next($request);
	}
}
