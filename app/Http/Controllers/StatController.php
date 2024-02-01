<?php
namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\Impression;
use App\Models\Collection;
use App\Models\Team;
use App\Helpers\StringHelper;
use App\Helpers\ValidationHelper;

class StatController extends CollectionController
{
	private $errorType = 'stat';
	private $errorMessage = '';
	private $errorKey = '';
	private $errorField = '';

	public function __construct()
	{
		parent::__construct();
		$this->refLength = config('app.impression.refLength');
		$this->refMaxLength = config('app.identity.refMaxLength');
	}

	public function getStats(Request $request)
	{
		try {
			$stats = $this->getAllStats();

			return $stats;
		} catch (Exception $e) {
			return $this->error($e);
		}
	}

	protected function getAllStats()
	{
		$totalUsers = User::orderBy('id')->count();
		$totalCollections = Collection::orderBy('id')->count();
		$totalImpressions = Impression::orderBy('id')->count();

		return [
			'users' => $totalUsers,
			'collections' => $totalCollections,
			'impressions' => $totalImpressions,
		];
	}
}
