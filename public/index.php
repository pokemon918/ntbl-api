<?php

define('MAINTENANCE', false);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type,Accept, Origin');

# Drop options type requests start
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
	die(__LINE__);
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'])) {
	http_response_code(405);
	die('{"status":"trespassing"}');
}

# Drop options type requests end

# Admin whitelisting start
$adminWhitelist = ['127.0.0.1' /*, '112.112.112.113'*/]; // Add your IP here to get access to admin features
define('IS_WHITELISTED', in_array($_SERVER['REMOTE_ADDR'], $adminWhitelist));
# Admin whitelisting end

/*
|--------------------------------------------------------------------------
| Admin Path
|--------------------------------------------------------------------------
|
| If any part of the url contains the string admin, it needs to go through a whitelist check.
| Full url is checked for cases like admin.noteable.com or api.noteable.com/admin/x-endpoint
|
*/

# /admin url start
if (0 === strpos($_SERVER['REQUEST_URI'], '/admin') && !IS_WHITELISTED) {
	http_response_code(401);
	exit(__LINE__);
}
# /admin url end

if (MAINTENANCE) {
	$statusCode = 503;
	$authError = [
		'status' => 'error',
		'statusCode' => $statusCode,
		'message' => 'Site down for maintenance',
		'error' => [
			'code' => $errorCode,
		],
	];
	http_response_code($statusCode);
	echo json_encode($authError);
	exit();
}

/*
|--------------------------------------------------------------------------
| Build Version
|--------------------------------------------------------------------------
*/

if ('/build.version' == parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)) {
	die(
		'<xmp>' .
			shell_exec(
				"git rev-parse --abbrev-ref HEAD && git --no-pager log -n 40 --pretty=format:'%cr [%h] %s' --abbrev-commit"
			) .
			'</xmp>'
	);
}

/*
|--------------------------------------------------------------------------
| Create The Application
|--------------------------------------------------------------------------
|
| First we need to get an application instance. This creates an instance
| of the application / container and bootstraps the application so it
| is ready to receive HTTP / Console requests from the environment.
|
*/

$app = require __DIR__ . '/../bootstrap/app.php';

/*
|--------------------------------------------------------------------------
| Run The Application
|--------------------------------------------------------------------------
|
| Once we have the application, we can handle the incoming request
| through the kernel, and send the associated response back to
| the client's browser allowing them to enjoy the creative
| and wonderful application we have prepared for them.
|
*/

$app->run();
