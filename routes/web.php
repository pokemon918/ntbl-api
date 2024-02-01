<?php
/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It is a breeze. Simply tell Lumen the URIs it should respond to
| and give it the Closure to call when that URI is requested.
|
*/

// Non-authenticated Routes for resource user titles , Note : shadowed lumen->fastroutes bug , non parametized routes needs to go first
$router->get('user/titles', 'UserController@listUserTitles');

// Authenticated Routes
$router->group(['middleware' => 'auth'], function () use ($router) {
	// Routes for resource note
	$router->get('tastingnote/{key}', 'NoteController@getByKey');
	$router->post('tastingnote', 'NoteController@getNotes');
	$router->post('autonote', 'NoteController@parseNotes');

	// Routes for resource tasting
	$router->post('tasting', 'TastingController@add');
	$router->get('tastings', 'TastingController@getList');
	$router->get('tastings/marked', 'TastingController@getUserMarkedImpressions');
	$router->get('tasting/{ref}', 'TastingController@getByRef');
	$router->get('tasting/{ref}/marked-by', 'TastingController@getMarkedImpressionUsers');
	$router->post('tasting/addImage/{ref}', 'TastingController@addImage');
	$router->post('tasting/delete', 'TastingController@delete');
	$router->post('tasting/{ref}', 'TastingController@updateByRef');
	$router->post('tasting/{ref}/mark', 'TastingController@markByRef');
	$router->post('tasting/{ref}/unmark', 'TastingController@unmarkByRef');

	// Routes providing raw table data - only for automated testing in DEV enviroment
	if (DEV) {
		$router->get('raw/impression/{ref}', 'ImpressionController@getRawImpression');
		$router->get('raw/identity/{refOrHandle}', 'UserController@getRawIdentity');
		$router->get('raw/notes', 'NoteController@getRawValidNotes');
		$router->get('raw/subscription/vouchers', 'SubscriptionController@getVouchers');
		$router->post('raw/subscription/migration', 'SubscriptionController@rawMigration');
		$router->post(
			'raw/subscription/vouchers/reset-usage-limit',
			'SubscriptionController@resetVouchersUsageLimit'
		);
		$router->post('raw/team/{refOrHandle}/invite/remove', 'TeamController@deleteInvitedUsers');
		$router->post('raw/users/remove', 'UserController@deactivateMultipleUsers');
	}

	// Authenticated Routes for resource identity
	$router->post('user/access', 'UserController@changePassword');
	$router->get('user/profile', 'UserController@getUserProfile');
	$router->get('user/plan', 'UserController@getPlan');
	$router->post('user/profile', 'UserController@updateUserProfile');
	$router->get('user/counts', 'UserController@getCounts');
	$router->get('user/{refOrHandelOrEmail}', 'UserController@getIdentity');
	$router->get('myinfo', ['as' => 'myinfo', 'uses' => 'UserController@getMyData']);
	$router->post('user/deactivate', 'UserController@deactivate');
	$router->post('user/educations', 'UserController@removeEducations');
	$router->post('user/interests', 'UserController@removeInterests');
	$router->get('user/team/join-requests', 'UserController@getPendingTeamJoinRequests');
	$router->get('user/team/invites', 'UserController@getPendingTeamInvites');
	$router->post('user/team-invite/{actionRef}/accept', 'UserController@acceptTeamInvite');

	// Authenticated Routes for resource feedback
	$router->post('feedback', 'FeedbackController@add');

	// Authenticated Routes for resource team
	$router->post('team', 'TeamController@add');
	$router->get('teams', 'TeamController@getTeams');
	$router->get('my-teams', 'TeamController@getMyTeams');
	$router->post('team/delete', 'TeamController@delete');
	$router->get('team/{refOrHandle}', 'TeamController@getByRefOrHandle');
	$router->post('team/{refOrHandle}', 'TeamController@updateByRefOrHandle');
	$router->post('team/{teamRefOrHandle}/user/{userRefOrHandle}', 'TeamController@addRelations');
	$router->post(
		'team/{teamRefOrHandle}/user/{userRefOrHandle}/remove',
		'TeamController@deleteRelations'
	);
	$router->get('my-teams/find/{keyword}', 'TeamController@searchMyTeams');
	$router->get('teams/find/{keyword}', 'TeamController@searchTeams');

	// Authenticated Routes for resource team invites
	$router->post('team/{refOrHandle}/invite/role/{type}', 'TeamController@inviteUsers');

	// Authenticated Routes for resource team join requests
	$router->post('team/{teamRefOrHandle}/join', 'TeamController@requestToJoinTeam');
	$router->get('team/{teamRefOrHandle}/join/pending', 'TeamController@getRequestsToJoinTeam');
	$router->post(
		'team/{teamRefOrHandle}/accept/{actionRef}',
		'TeamController@acceptRequestToJoinTeam'
	);
	$router->post(
		'team/{teamRefOrHandle}/decline/{actionRef}',
		'TeamController@declineRequestToJoinTeam'
	);

	// Authenticated Routes for resource event
	$router->get('events', 'EventController@getPublicEvents');
	$router->get('my-events', 'EventController@getOwnEvents');
	$router->get('{userRef}/events', 'EventController@getPublicEventsByUserRef');
	$router->post('event', 'EventController@add');
	$router->post('event/delete', 'EventController@delete');
	$router->post('event/{ref}', 'EventController@updateByRef');
	$router->get('event/{ref}', 'EventController@getByRef');
	$router->post('event/{ref}/tastings', 'EventController@deleteWines');
	$router->get('events/featured', 'EventController@getFeaturedEvents');

	// Admin Only Routes
	$router->group(['middleware' => 'admin'], function () use ($router) {
		$router->post('events/featured/add', 'EventController@addFeaturedEvents');
		$router->post('events/featured/remove', 'EventController@deleteFeaturedEvents');
	});

	// Authenticated Routes for resource subscription
	$router->get('subscription', 'SubscriptionController@getUserSubscription');
	$router->get('subscription/billing/portal', 'SubscriptionController@getBillingPortal');
	$router->post('subscription', 'SubscriptionController@addSubscription');
	$router->get('subscription/refresh', 'SubscriptionController@refreshSubscription');
	$router->post(
		'subscription/change-to/{subscriptionPlanKey}',
		'SubscriptionController@updateSubscription'
	);
	$router->post('subscription/cancel', 'SubscriptionController@cancel');
	$router->post('subscription/delayed-cancel', 'SubscriptionController@delayedCancel');
	$router->post('subscription/stop-delayed-cancel', 'SubscriptionController@stopDelayedCancel');

	// Authenticated Routes for resource contest
	$router->post('/contest/new', 'ContestController@add');
	$router->get('/contest/{contestRef}', 'ContestController@getByRef');
	$router->get(
		'/contest/{contestRef}/collection/{collectionRef}/stats',
		'ContestController@getContestStats'
	);
	$router->get(
		'/contest/{contestRef}/collection/{collectionRef}/team/{divisionRef}/stats',
		'ContestController@getTeamStats'
	);
	$router->post(
		'/contest/{contestRef}/request/role/{type}',
		'ContestController@requestToJoinContest'
	);
	$router->post(
		'/contest/{contestRef}/invite/role/{type}',
		'ContestController@inviteUsersToContest'
	);
	$router->post('/contest/{contestRef}/add/team', 'ContestController@addDivisionTeam');
	$router->post(
		'/contest/{contestRef}/remove/team/{teamRef}',
		'ContestController@removeDivisionTeam'
	);
	$router->post('/contest/{contestRef}/add/collection', 'ContestController@addCollection');
	$router->post(
		'/contest/{contestRef}/remove/collection/{collectionRef}',
		'ContestController@removeCollection'
	);
	$router->post(
		'/contest/{contestRef}/put/{userRef}/on/{divisionRef}',
		'ContestController@assignParticipantToDivision'
	);
	$router->post(
		'/contest/{contestRef}/remove/{userRef}/from/{divisionRef}',
		'ContestController@removeParticipantFromDivision'
	);
	$router->post(
		'/contest/{contestRef}/let/{userRef}/be/{roleKey}',
		'ContestController@assignParticipantRole'
	);
	$router->post(
		'/contest/{contestRef}/collection/{collectionRef}/assign/{divisionRef}',
		'ContestController@assignCollectionToDivision'
	);
	$router->post(
		'/contest/{contestRef}/collection/{collectionRef}/remove/{divisionRef}',
		'ContestController@removeCollectionFromDivision'
	);
	$router->post(
		'contest/{contestRef}/collection/{collectionRef}/import/impressions',
		'ContestController@importMyContestImpressions'
	);
	$router->post(
		'/contest/{contestRef}/collection/{collectionRef}/subject/{impressionRef}/statement',
		'ContestController@addOrUpdateContestStatement'
	);
	$router->post(
		'/contest/{contestRef}/collection/{collectionRef}/team/{divisionRef}/subject/{impressionRef}/statement',
		'ContestController@addOrUpdateDivisionStatement'
	);
	$router->get('/contest/{contestRef}/progress', 'ContestController@getContestProgress');
	$router->get(
		'/contest/{contestRef}/team/{divisionRef}/progress',
		'ContestController@getDivisionProgress'
	);
	$router->post(
		'/contest/{contestRef}/user/{userRef}/metadata',
		'ContestController@addUserMetadata'
	);
	$router->get(
		'/contest/{contestRef}/user/{userRef}/metadata',
		'ContestController@getUserMetadata'
	);
	$router->get('/contest/search/handle/{contestHandle}', 'ContestController@searchByHandle');
	$router->post(
		'/contest/{contestRef}/accept/user/{userRef}',
		'ContestController@acceptAllRequests'
	);
	$router->get(
		'/contest/{contestRef}/summary/statements/admin',
		'ContestController@getStatementSummary'
	);
	$router->get(
		'/contest/{contestRef}/team/{teamRef}/statements/summary',
		'ContestController@getStatementSummaryV2'
	);
	$router->post(
		'/contest/{targetRef}/copy-from/contest/{sourceRef}/{roleKey}',
		'ContestController@copyParticipants'
	);
	$router->post(
		'/contest/{targetRef}/copy-from/contest/{sourceRef}/requests/{roleKey}',
		'ContestController@copyRequestsAndInvites'
	);
	$router->post('/contest/{contestRef}/reset-members', 'ContestController@resetDivisionMembers');
	$router->get('/contest/{contestRef}/result/export', 'ContestController@exportContestResults');

	// Authenticated Routes for resource admin
	$router->post('admin/replay/tasting', 'TastingController@add');
	$router->post('admin/replay/event', 'EventController@add');
	$router->post('admin/replay/team', 'TeamController@add');
	$router->post('admin/tastingnote/{key}', 'NoteController@addNote');
	$router->post('admin/notes/deprecate', 'NoteController@deprecateNotes');
	$router->post('admin/notes/activate', 'NoteController@activateNotes');
	$router->get('admin/notes', 'NoteController@getValidNotes');
	$router->get('admin/subscription', 'SubscriptionController@getSiteSubscriptions');
	$router->get('admin/subscription/transactions', 'SubscriptionController@getSiteTransactions');
	$router->get('admin/authroutes', 'RouteController@getAuthRoutes');
	$router->post('admin/subscription/vouchers', 'SubscriptionController@addVouchers');
	$router->get('admin/newsletter', 'NewsletterController@getDetails');
	$router->post('admin/newsletter/subscribe', 'NewsletterController@subscribe');
});

// Docs
$router->get('/', 'DocsController@index');

// Non-authenticated Routes for resource identity
$router->post('user/access/reset', 'UserController@resetPassword');
$router->post('user', 'UserController@add');
$router->get('user', 'UserController@getUserSpecs');

// Import Event Wine Data
$router->post('admin/event/{ref}/import/wines', 'EventController@importData');
$router->post(
	'admin/contest/{contestRef}/collection/{collectionRef}/import/impressions',
	'ContestController@adminImportImpressions'
);

// Export Event Teacher Data
$router->get('admin/event/{ref}/export/teacher', 'EventController@exportTeacher');

// Export User Tastings Data
$router->get('admin/user/{ref}/export/tastings', 'TastingController@exportTastings');

// Stats
$router->get('admin/stats', 'StatController@getStats');

// Available Subscription Plan
$router->get('subscription/plans', 'SubscriptionController@getSubscriptionPlans');

// Webhooks
$router->post('webhooks/chargify', 'WebhookController@catchEvent');

// Images
$router->get('images/{ref}', 'FileController@serveImage');

// Aggregated Impressions
$router->get('impression/aggregated/{origin}', 'TastingController@getAggregatedList');
