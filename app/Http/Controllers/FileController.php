<?php
namespace App\Http\Controllers;

use Auth;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use App\Models\File;
use App\Helpers\StringHelper;
use App\Helpers\ValidationHelper;
use App\Helpers\FileHelper;

class FileController extends Controller
{
	const MODEL = 'App\Models\File';

	private $image = null;
	private $allowedFileTypes = [];
	private $errorType = 'file';

	public function __construct()
	{
		parent::__construct();
		$this->allowedFiles = config('app.fileUpload.allowedFiles');
	}

	public function serveImage($ref, Request $request)
	{
		try {
			$ref = strtolower($ref);
			$this->validateImageRef($ref);
			$driver = config('filesystems.default');
			$imagePath = 'images/' . $this->image->file_name;
			$asBase64 = $request->get('base64');

			if (!Storage::disk($driver)->exists($imagePath)) {
				$this->fail(
					'File is missing.',
					$this->errorCodes['exists'],
					'file',
					__FILE__,
					__LINE__,
					[
						'file' => $imagePath,
					]
				);
			}

			$contents = Storage::get($imagePath);

			if ($asBase64 === 'true') {
				return response(base64_encode($contents));
			}

			return response($contents)
				->header('Content-type', $this->image->mime_type)
				->header('Cache-Control', 'max-age=86400, public');
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	protected function validateImageRef($imageRef)
	{
		ValidationHelper::validateEntityExists($imageRef, 'file', 'ref', false);
		$this->image = File::where('ref', '=', $imageRef)->first();

		$allowedImages = $this->allowedFiles['images'];
		$allowedMimeTypes = $allowedImages['mime'];

		if (!in_array($this->image->mime_type, $allowedMimeTypes)) {
			$this->fail(
				'This file is not an image',
				$this->errorCodes['invalid_file_mime_type'],
				'',
				__FILE__,
				__LINE__,
				[
					'detectedMimeType' => $this->image->mimeType,
				]
			);
		}
	}
}
