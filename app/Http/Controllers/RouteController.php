<?php
namespace App\Http\Controllers;

use Auth;
use Exception;
use Route;
use Illuminate\Http\Request;

class RouteController extends Controller
{
	private $errorType = 'route';

	public function __construct()
	{
		parent::__construct();
	}

	public function getAuthRoutes(Request $request)
	{
		$who = $request->input('who');
		if (!DEV && !in_array($who, config('app.devRefs'))) {
			$this->fail(
				'Unauthorized access',
				$this->errorCodes['invalid_access'],
				'',
				__FILE__,
				__LINE__,
				null
			);
		}

		$routes = Route::getRoutes();
		$authenticatedRoutes = [];
		foreach ($routes as $route) {
			if (isset($route['action']['middleware'])) {
				if (in_array('auth', $route['action']['middleware'])) {
					$authenticatedRoutes[] = [
						'method' => $route['method'],
						'uri' => $route['uri'],
					];
				}
			}
		}

		return $authenticatedRoutes;
	}
}
