<?php
use Monolog\Handler\StreamHandler;
use Monolog\Handler\SyslogUdpHandler;
return [
	/*
    |--------------------------------------------------------------------------
    | Default Log Team
    |--------------------------------------------------------------------------
    |
    | This option defines the default log team that gets used when writing
    | messages to the logs. The name specified in this option should match
    | one of the teams defined in the "teams" configuration array.
    |
    */
	'default' => env('LOG_CHANNEL', 'stack'),
	/*
    |--------------------------------------------------------------------------
    | Log Teams
    |--------------------------------------------------------------------------
    |
    | Here you may configure the log teams for your application. Out of
    | the box, Laravel uses the Monolog PHP logging library. This gives
    | you a variety of powerful log handlers / formatters to utilize.
    |
    | Available Drivers: "single", "daily", "slack", "syslog",
    |                    "errorlog", "monolog",
    |                    "custom", "stack"
    |
    */
	'channels' => [
		'stack' => [
			'driver' => 'stack',
			'channels' => ['daily', 'bugsnag'],
			'ignore_exceptions' => false,
		],
		'single' => [
			'driver' => 'single',
			'path' => storage_path('logs/lumen.log'),
			'level' => 'debug',
		],
		'daily' => [
			'driver' => 'daily',
			'path' => storage_path('logs/lumen.log'),
			'level' => 'debug',
			'days' => 14,
		],
		'slack' => [
			'driver' => 'slack',
			'url' => env('LOG_SLACK_WEBHOOK_URL'),
			'username' => 'Laravel Log',
			'emoji' => ':boom:',
			'level' => 'critical',
		],
		'papertrail' => [
			'driver' => 'monolog',
			'level' => 'debug',
			'handler' => SyslogUdpHandler::class,
			'handler_with' => [
				'host' => env('PAPERTRAIL_URL'),
				'port' => env('PAPERTRAIL_PORT'),
			],
		],
		'stderr' => [
			'driver' => 'monolog',
			'handler' => StreamHandler::class,
			'formatter' => env('LOG_STDERR_FORMATTER'),
			'with' => [
				'stream' => 'php://stderr',
			],
		],
		'syslog' => [
			'driver' => 'syslog',
			'level' => 'debug',
		],
		'errorlog' => [
			'driver' => 'errorlog',
			'level' => 'debug',
		],
		'bugsnag' => [
			'driver' => 'bugsnag',
			'level' => 'error',
		],
	],
];
