<?php
namespace App\Http\Controllers;

// Todo: move documentation somewhere better.
class DocsController extends Controller
{
	public function __construct()
	{
		parent::__construct();
	}

	public function index()
	{
		$apiDictionary = [];

		// Raw
		$raw = [
			'name' => 'Raw Routes',
			'routes' => [
				[
					'uri' => '/raw/impression/{ref}',
					'method' => 'GET',
					'description' =>
						'Returns a list of raw Impression data that are related to the ref',
					'action' => 'ImpressionController@getRawImpression',
					'wiki' =>
						'https://bitbucket.org/mathiasrw/ntbl-api/wiki/App%20Routes/Raw/Raw%20Impression',
				],
				[
					'uri' => '/raw/identity/{ref}',
					'method' => 'GET',
					'description' =>
						'Returns a the raw Identity/User data based on the given user ref',
					'action' => 'IdentityController@getRawIdentity',
					'wiki' =>
						'https://bitbucket.org/mathiasrw/ntbl-api/wiki/App%20Routes/Raw/Raw%20Identity',
				],
			],
		];

		// Tasting Note
		$tastingNote = [
			'name' => 'Tasting Note',
			'routes' => [
				[
					'uri' => '/tastingnote/{key}',
					'method' => 'GET',
					'description' => 'Returns the note key along with an array of related langs',
					'action' => 'NoteController@getByKey',
					'wiki' =>
						'https://bitbucket.org/mathiasrw/ntbl-api/wiki/App%20Routes/Tasting%20Notes/Get%20By%20Key',
				],
				[
					'uri' => '/tastingnote/{key}',
					'method' => 'POST',
					'description' =>
						'Creates a new note (by key) along with an array of related langs based on the given payload',
					'action' => 'NoteController@addByKey',
					'wiki' =>
						'https://bitbucket.org/mathiasrw/ntbl-api/wiki/App%20Routes/Tasting%20Notes/Add%20By%20Key',
				],
			],
		];

		// Tasting
		$tasting = [
			'name' => 'Tasting',
			'routes' => [
				[
					'uri' => '/tasting/{ref}',
					'method' => 'GET',
					'description' => 'Returns tasting data by ref',
					'action' => 'TastingController@getByRef',
					'wiki' =>
						'https://bitbucket.org/mathiasrw/ntbl-api/wiki/App%20Routes/Tasting/Get%20By%20Ref',
				],
				[
					'uri' => '/tastings',
					'method' => 'GET',
					'description' => 'Returns a list of tastings along with their related data',
					'action' => 'TastingController@getList',
					'wiki' =>
						'https://bitbucket.org/mathiasrw/ntbl-api/wiki/App%20Routes/Tasting/Get%20List',
				],
				[
					'uri' => '/tasting',
					'method' => 'POST',
					'description' => 'Creates a new tasting based on the given payload',
					'action' => 'TastingController@add',
					'wiki' =>
						'https://bitbucket.org/mathiasrw/ntbl-api/wiki/App%20Routes/Tasting/Add',
				],
			],
		];

		// User
		$user = [
			'name' => 'User',
			'routes' => [
				[
					'uri' => '/user',
					'method' => 'POST',
					'description' => 'Creates a new user based on the given payload',
					'action' => 'IdentityController@add',
					'wiki' => 'https://bitbucket.org/mathiasrw/ntbl-api/wiki/App%20Routes/User/Add',
				],
			],
		];

		$apiDictionary[] = $raw;
		$apiDictionary[] = $tastingNote;
		$apiDictionary[] = $tasting;
		$apiDictionary[] = $user;

		return view('docs', ['apiDictionary' => $apiDictionary]);
	}
}
