<?php
namespace App\Http\Controllers;

use Auth;
use Exception;
use Laravel\Lumen\Routing\Controller as BaseController;
use Illuminate\Support\Arr;
use App\Models\User;
use App\Models\Identity;
use App\Models\Origin;
use App\Models\Lifecycle;
use App\Models\Subject;
use App\Models\Individual;
use App\Models\Stats;
use App\Models\Rating;
use App\Models\Impression;
use App\Models\ImpressionNote;
use App\Models\ImpressionFile;
use App\Models\Note;
use App\Models\File;
use App\Helpers\StringHelper;
use App\Helpers\ValidationHelper;
use App\Helpers\FileHelper;
use App\Helpers\Commons;
use App\Helpers\LogHelper;
use App\Traits\RESTActions;

class Controller extends BaseController
{
	use RESTActions;
	protected $ruleMessages = [];
	protected $errorCodes = [];

	public function __construct()
	{
		$this->ruleMessages = config('app.ruleMessages');
		$this->errorCodes = config('app.errorCodes');
		$this->fileRefLength = config('app.file.refLength');
	}

	protected function checkValidatorForErrors(
		$validator,
		$errorMsg = '',
		$errorKey = '',
		$errorField = '',
		$debugInfo = []
	) {
		ValidationHelper::checkValidatorForErrors(
			$validator,
			$errorMsg,
			$errorKey,
			$errorField,
			$debugInfo
		);
	}

	protected function devAccessOnly()
	{
		if (!DEV) {
			throw new Exception('Bad request');
		}
	}

	protected function deleteEntitiesWithRef($model, $entities)
	{
		if (empty($entities) || count($entities) <= 0) {
			$this->fail(
				'Payload empty or invalid',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__
			);
		}

		// https://github.com/laravel/framework/issues/2536
		$model
			::whereIn('ref', $entities->pluck('ref'))
			->get()
			->each->delete();
	}

	protected function extractImages($files)
	{
		$images = [];

		if (!empty($files)) {
			foreach ($files as $file) {
				$images[] = url('/') . '/' . $file->path;
			}
		}

		return $images;
	}

	protected function processAvatar($entity, $payload)
	{
		// Ensures that the entity will have a avatar property
		$entity->avatar = $entity->avatar;

		if (empty($payload[$this->avatarPayloadKey])) {
			return $entity;
		}

		ValidationHelper::validateImage($this->avatarPayloadKey);
		if (!empty($entity->avatar)) {
			$this->deleteAvatar($entity->avatar);
		}

		$avatar = $this->saveAvatar($payload[$this->avatarPayloadKey]);
		if ($avatar) {
			$entity->avatar = $avatar->ref;
		}

		return $entity;
	}

	protected function saveAvatar($file)
	{
		$fileInfo = FileHelper::storeFile($file);
		$savedFile = FileHelper::saveFile($fileInfo, $this->fileRefLength);
		return $savedFile;
	}

	protected function deleteAvatar($avatarRef)
	{
		if (!empty($avatarRef)) {
			$prevAvatar = File::where('ref', '=', $avatarRef)->first();
			if (!empty($prevAvatar)) {
				FileHelper::deleteFile($prevAvatar);
				$prevAvatar->delete();
			}
		}
	}

	protected function setFilePayloadKey($request, $payload, $filePayloadKey)
	{
		if ($request->hasFile($filePayloadKey) && $request->file($filePayloadKey)->isValid()) {
			$payload[$filePayloadKey] = $request->file($filePayloadKey);
		}

		return $payload;
	}
}
