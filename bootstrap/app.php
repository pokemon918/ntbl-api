<?php
require_once __DIR__ . '/../vendor/autoload.php';

(new Laravel\Lumen\Bootstrap\LoadEnvironmentVariables(realpath(__DIR__ . '/../')))->bootstrap();

/*
|--------------------------------------------------------------------------
| Create The Application
|--------------------------------------------------------------------------
|
| Here we will load the environment and create the application instance
| that serves as the central piece of this framework. We'll use this
| application as an "IoC" container and router for this framework.
|
*/

$app = new Laravel\Lumen\Application(realpath(__DIR__ . '/../'));
$app->withFacades();
$app->withEloquent();

/*
|--------------------------------------------------------------------------
| Register Container Bindings
|--------------------------------------------------------------------------
|
| Now we will register a few bindings in the service container. We will
| register the exception handler and the console kernel. You may add
| your own bindings here if you like or you can make another file.
|
*/

$app->singleton(Illuminate\Contracts\Debug\ExceptionHandler::class, App\Exceptions\Handler::class);

$app->singleton(Illuminate\Contracts\Console\Kernel::class, App\Console\Kernel::class);

$app->singleton(Illuminate\Contracts\Filesystem\Factory::class, function ($app) {
	return new Illuminate\Filesystem\FilesystemManager($app);
});

/*
|--------------------------------------------------------------------------
| App globals/contants
|--------------------------------------------------------------------------
*/
require_once __DIR__ . '/../config/globals.php';

/*
|--------------------------------------------------------------------------
| Register Middleware
|--------------------------------------------------------------------------
|
| Next, we will register the middleware with the application. These can
| be global middleware that run before and after each request into a
| route or middleware that'll be assigned to some specific routes.
|
*/

$app->middleware([
	App\Http\Middleware\LimitRequestMethodAccess::class,
	App\Http\Middleware\HandleJSONP::class,
	App\Http\Middleware\Cors::class,
]);

$app->routeMiddleware([
	'auth' => App\Http\Middleware\Authenticate::class,
	'admin' => App\Http\Middleware\AdminOnly::class,
	'devAccessOnly' => App\Http\Middleware\DevAccessOnly::class,
]);

/*
|--------------------------------------------------------------------------
| Register Service Providers
|--------------------------------------------------------------------------
|
| Here we will register all of the application's service providers which
| are used to bind services into the container. Service providers are
| totally optional, so you are not required to uncomment this line.
|
*/

$app->register(Bugsnag\BugsnagLaravel\BugsnagServiceProvider::class);
$app->register(App\Providers\AppServiceProvider::class);
$app->register(App\Providers\AuthServiceProvider::class);
$app->register(Illuminate\Mail\MailServiceProvider::class);
$app->register(App\Providers\DbProfilerServiceProvider::class);
$app->register(Fedeisas\LaravelMailCssInliner\LaravelMailCssInlinerServiceProvider::class);
// $app->register(App\Providers\EventServiceProvider::class);

/*
|--------------------------------------------------------------------------
| Load The Application Routes
|--------------------------------------------------------------------------
|
| Next we will include the routes file so that they can all be added to
| the application. This will provide all of the URLs the application
| can respond to, as well as the controllers that may handle them.
|
*/

$app->router->group(['namespace' => 'App\Http\Controllers'], function ($router) {
	require __DIR__ . '/../routes/web.php';
});

/*
|--------------------------------------------------------------------------
| Custom app configurations
|--------------------------------------------------------------------------
*/

$app->configure('app');
$app->configure('base64');
$app->configure('bugsnag');
$app->configure('css-inliner');
$app->configure('database');
$app->configure('filesystems');
$app->configure('frontend');
$app->configure('logging');
$app->configure('mail');
$app->configure('mailtemplate');
$app->configure('regex');
$app->configure('subscription');

return $app;
