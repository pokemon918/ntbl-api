<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Log;

class Cors
{
	public function handle($request, Closure $next, $guard = null)
	{
		if ($request->getMethod() == 'OPTIONS') {
			return response(['OK'], 200)->withHeaders([
				//	'Access-Control-Allow-Origin' => '*',
				//	'Access-Control-Allow-Methods' => 'GET, POST',
				'Access-Control-Allow-Credentials' => true,
				'Access-Control-Allow-Headers' => 'Authorization, Content-Type',
			]);
		}

		return //->header('Access-Control-Allow-Origin', '*')
			//->header('Access-Control-Allow-Methods', 'GET, POST')
			$next($request)
				->header('Access-Control-Allow-Credentials', true)
				->header('Access-Control-Allow-Headers', 'Authorization, Content-Type');

		return $next($request);
	}
}
