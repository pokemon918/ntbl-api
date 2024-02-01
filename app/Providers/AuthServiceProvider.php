<?php
namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use App\Models\Identity;
use App\Models\User;
use App\Helpers\ValidationHelper;
use App\Helpers\AuthHelper;
use App\Helpers\LogHelper;
use App\Others\NTBL_Sign;
use Base32\Base32;
use DateTime;
use Exception;

class AuthServiceProvider extends ServiceProvider
{
	/**
	 * Register any application services.
	 *
	 * @return void
	 */
	public function register()
	{
		//
	}

	/**
	 * Boot the authentication services for the application.
	 *
	 * @return void
	 */
	public function boot()
	{
		// Here you may define how you wish users to be authenticated for your Lumen
		// application. The callback which receives the incoming request instance
		// should return either a User instance or null. You're free to obtain
		// the User instance via an API token or any other method necessary.
		$this->app['auth']->viaRequest('api', function ($request) {
			$identity = AuthHelper::authenticate($request);
			return $identity;
		});
	}
}
