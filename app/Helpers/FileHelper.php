<?php
namespace App\Helpers;

use App\Exceptions\APIException;
use App\Models\ImpressionFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Helpers\StringHelper;
use App\Helpers\ValidationHelper;
use App\Models\File;

class FileHelper
{
	private static $fileErrorMessages = [];
	private static $errorCodes = [];
	private static $field = 'file';

	public static function init()
	{
		if (empty(self::$fileErrorMessages)) {
			self::$fileErrorMessages = config('app.fileErrorMessages');
		}

		if (empty(self::$errorCodes)) {
			self::$errorCodes = config('app.errorCodes');
		}
	}

	public static function validateFilePayload($expectedFile)
	{
		if (empty($expectedFile)) {
			return;
		}

		self::$field = $expectedFile;

		if (!isset($_FILES[$expectedFile])) {
			self::fail(
				'No file was uploaded.',
				self::$errorCodes['invalid_file'],
				self::$field,
				__FILE__,
				__LINE__
			);
		}

		if ($_FILES[$expectedFile]['error'] > 0) {
			self::fail(
				self::getFileErrorMessage($_FILES[$expectedFile]['error']),
				self::$errorCodes['invalid_file'],
				self::$field,
				__FILE__,
				__LINE__,
				['file' => $_FILES[$expectedFile]]
			);
		}
	}

	public static function validateFile(
		$expectedFile,
		$allowedFileExtensions,
		$allowedMimeTypes,
		$maxBytes
	) {
		self::validateFilePayload($expectedFile);
		$filePayload = $_FILES[$expectedFile];

		self::validateFileExt($filePayload, $allowedFileExtensions);
		self::validateFileMimeType($filePayload, $allowedMimeTypes);
		self::validateFileSize($filePayload, $maxBytes);
	}

	protected static function validateFileExt($filePayload, $allowedFileExtensions)
	{
		$fileName = $filePayload['name'];
		$uploadedFileExtType = pathinfo($fileName, PATHINFO_EXTENSION);

		if (!in_array($uploadedFileExtType, $allowedFileExtensions)) {
			self::fail(
				'Invalid file extension.',
				self::$errorCodes['invalid_file_ext_type'],
				self::$field,
				__FILE__,
				__LINE__,
				[
					'file' => $filePayload,
				]
			);
		}
	}

	protected static function validateFileMimeType($filePayload, $allowedMimeTypes)
	{
		$uploadedFileMimeType = mime_content_type($filePayload['tmp_name']);

		if (!in_array($uploadedFileMimeType, $allowedMimeTypes)) {
			self::fail(
				'Invalid file mimetype.',
				self::$errorCodes['invalid_file_mime_type'],
				self::$field,
				__FILE__,
				__LINE__,
				[
					'file' => $filePayload,
					'detectedMimeType' => $uploadedFileMimeType,
				]
			);
		}
	}

	protected static function validateFileSize($filePayload, $maxBytes)
	{
		$uploadedFileSize = $filePayload['size'];

		if ($uploadedFileSize > $maxBytes) {
			self::fail(
				'Invalid file size.',
				self::$errorCodes['invalid_file_size'],
				self::$field,
				__FILE__,
				__LINE__,
				[
					'file' => $filePayload,
					'fileSize' => $uploadedFileSize,
				]
			);
		}
	}

	protected static function getFileErrorMessage($errorCode)
	{
		// Note: file error messages were based on the official PHP definitions - http://php.net/manual/en/features.file-upload.errors.php
		if (isset(self::$fileErrorMessages[$errorCode])) {
			return self::$fileErrorMessages[$errorCode];
		}

		return 'Invalid file. Code: ' + $errorCode;
	}

	public static function parseJsonFile($file)
	{
		$fullFilePath = $file->getPathName();
		$decodedJson = json_decode(file_get_contents($fullFilePath), true);
		return $decodedJson;
	}

	public static function storeFile($file, $loc = 'images')
	{
		$fileInfo = [];
		$path = $file->store($loc);
		$fileRawInfo = explode('/', $path);
		$fileInfo['path'] = $path;
		$fileInfo['name'] = $fileRawInfo[1];
		$fileInfo['tempPath'] = $file->getRealPath();
		$fileInfo['originalName'] = $file->getClientOriginalName();
		$fileInfo['ext'] = $file->getClientOriginalExtension();
		$fileInfo['size'] = $file->getSize();
		$fileInfo['type'] = $file->getMimeType();

		return $fileInfo;
	}

	public static function saveFile($fileInfo, $refLength)
	{
		$file = new File();
		$file->ref = StringHelper::readableRefGenerator($refLength, 'file', 'ref');
		$file->path = $fileInfo['path'];
		$file->mime_type = $fileInfo['type'];
		$file->file_name = $fileInfo['name'];
		$file->file_ext = $fileInfo['ext'];
		$file->file_size = $fileInfo['size'];
		$file->save();

		return $file;
	}

	public static function deleteFile($file)
	{
		$imagePath = 'images/' . $file->file_name;
		$driver = config('filesystems.default');
		Storage::delete($imagePath);
	}

	public static function getFiles($model, $table, $id)
	{
		$files = $model
			::with(['file'])
			->where($table . '_id', '=', $id)
			->get();

		return $files;
	}

	public static function fail($msg, $code, $field, $file, $line, $debugInfo = [])
	{
		ValidationHelper::fail($msg, $code, $field, $file, $line, $debugInfo);
	}
}

FileHelper::init();
