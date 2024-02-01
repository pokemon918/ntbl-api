<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Response;
use App\Helpers\ValidationHelper;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class HandleJSONP
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
		$response = $next($request);

		try {
			$_GET_lower = array_change_key_case($_GET, CASE_LOWER);
			$jsonp = null;

			if (isset($_GET_lower['jsonp'])) {
				$jsonp = 'jsonp';
				if (0 < strlen('' . $_GET_lower['jsonp'])) {
					$jsonp = '' . $_GET_lower['jsonp'];
				}
			} elseif (isset($_GET_lower['callback'])) {
				$jsonp = 'callback';
				if (0 < strlen('' . $_GET_lower['callback'])) {
					$jsonp = '' . $_GET_lower['callback'];
				}
			}

			if ($jsonp) {
				// handle invalid callbacks
				if (!ValidationHelper::isCallbackValid($jsonp)) {
					return response()->json(
						['message' => 'Invalid callback'],
						Response::HTTP_BAD_REQUEST
					);
				}

				return response()
					->json($response->original)
					->setCallback($jsonp);
			}
		} catch (Exception $e) {
			$currentUser = Auth::user();

			$logData = [
				'request' => request(),
				'user_ref' => $currentUser->ref,
				'msg' => 'JSONP error found',
				'error' => [
					'msg' => 'JSONP error found.',
					'data' => [
						'user_id' => $currentUser->id,
					],
				],
			];

			LogHelper::log(500, $logData, true);

			return $this->error($e, 'jsonp');
		}

		return $response;
	}
}
