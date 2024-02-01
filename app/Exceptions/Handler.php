<?php
namespace App\Exceptions;

use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Laravel\Lumen\Exceptions\Handler as ExceptionHandler;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use App\Exceptions\APIException;
use App\Helpers\LogHelper;
use App\Traits\RESTActions;

class Handler extends ExceptionHandler
{
	use RESTActions;

	/**
	 * A list of the exception types that should not be reported.
	 *
	 * @var array
	 */
	protected $dontReport = [
		AuthenticationException::class,
		AuthorizationException::class,
		APIException::class,
		HttpException::class,
		NotFoundHttpException::class,
		MethodNotAllowedHttpException::class,
		ModelNotFoundException::class,
		ValidationException::class,
	];

	/**
	 * Report or log an exception.
	 *
	 * This is a great spot to send exceptions to Sentry, Bugsnag, etc.
	 *
	 * @param  \Exception  $e
	 * @return void
	 */
	public function report(Exception $e)
	{
		$request = request();
		$localhost = $request->ip() == '127.0.0.1';

		// Resume normal flow if application can't connect to a data source
		$user = Auth::user();
		$userRef = !empty($user) && isset($user->ref) ? $user->ref : null;

		// Custom Log
		LogHelper::HttpLog500($request->url(), $e->getMessage(), $request->all(), $userRef);

		// Only send to BugSnag if not in LOCALHOST (defined at config/globals.php)
		if (!$localhost && PROD) {
			// Lumen/Laravel Default, pass exception to base class
			parent::report($e);
		}
	}

	/**
	 * Render an exception into an HTTP response.
	 *
	 * @param  \Illuminate\Http\Request  $request
	 * @param  \Exception  $e
	 * @return \Illuminate\Http\Response
	 */
	public function render($request, Exception $e)
	{
		// Always return custom ntbl json
		return $this->error($e);

		// Lumen/Laravel Default , render html
		// return parent::render($request, $e);
	}
}
