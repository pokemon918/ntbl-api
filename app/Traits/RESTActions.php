<?php
namespace App\Traits;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use App\Exceptions\APIException;
use App\Helpers\ValidationHelper;

trait RESTActions
{
	public function all()
	{
		$m = self::MODEL;
		return $this->respond(Response::HTTP_OK, $m::all());
	}

	public function get($id)
	{
		$m = self::MODEL;
		$model = $m::find($id);
		if (is_null($model)) {
			return $this->respond(Response::HTTP_NOT_FOUND);
		}
		return $this->respond(Response::HTTP_OK, $model);
	}

	public function add(Request $request)
	{
		$m = self::MODEL;
		$this->validate($request, $m::$rules);
		return $this->respond(Response::HTTP_CREATED, $m::create($request->all()));
	}

	public function put(Request $request, $id)
	{
		$m = self::MODEL;
		$this->validate($request, $m::$rules);
		$model = $m::find($id);
		if (is_null($model)) {
			return $this->respond(Response::HTTP_NOT_FOUND);
		}
		$model->update($request->all());
		return $this->respond(Response::HTTP_OK, $model);
	}

	public function remove($id)
	{
		$m = self::MODEL;
		if (is_null($m::find($id))) {
			return $this->respond(Response::HTTP_NOT_FOUND);
		}
		$m::destroy($id);
		return $this->respond(Response::HTTP_NO_CONTENT);
	}

	protected function respond($status, $data = [])
	{
		return response()->json($data, $status, [], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
	}

	protected function error($e, $type = null, $responseCode = Response::HTTP_BAD_REQUEST)
	{
		$errorCode = method_exists($e, 'getApiErrorCode') ? $e->getApiErrorCode() : $e->getCode();
		$field = method_exists($e, 'getField') && !empty($e->getField()) ? $e->getField() : null;
		$errorMessage = $e->getMessage();

		if ($e instanceof \QueryException || $e instanceof \PDOException) {
			$errorMessage = 'For DEV only: ' . $errorMessage;

			if (PROD) {
				$errorCode = '400';
				$errorMessage =
					'Oh no! An unexpected problem with the database blocked your request.';
			}
		}

		$trace = null;
		if (DEBUG || !PROD) {
			$trace = explode(
				PHP_EOL,
				preg_replace('/\):.+?\r?\n/', ')' . PHP_EOL, $e->getTraceAsString())
			);
		}

		$data = [
			'status' => 'error',
			'statusCode' => $responseCode,
			'message' => $errorMessage,
			'error' => [
				'code' => $errorCode,
				'field' => $field,
				'type' => $type,
				'trace' => $trace,
			],
		];

		return $this->respond($responseCode, $data);
	}

	function success($msg = '', $responseCode = Response::HTTP_OK, $params = [])
	{
		$data = ['status' => 'success', 'message' => $msg, 'data' => $params];
		return $this->respond($responseCode, $data);
	}

	function fail($msg, $code, $field, $file, $line, $debugInfo = [])
	{
		ValidationHelper::fail($msg, $code, $field, $file, $line, $debugInfo);
	}
}
