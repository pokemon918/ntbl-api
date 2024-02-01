<?php
namespace App\Exceptions;

use Exception;

class APIException extends Exception
{
	private $apiErrorCode = '';
	private $field = '';
	private $type = '';

	public function __construct(
		$message,
		$apiErrorCode,
		$field,
		$exceptionCode = 0,
		Exception $previous = null
	) {
		$this->apiErrorCode = $apiErrorCode;
		$this->field = $field;
		parent::__construct($message, $exceptionCode, $previous);
	}

	public function setApiErrorCode($apiErrorCode)
	{
		$this->apiErrorCode = $apiErrorCode;
	}

	public function setField($field)
	{
		$this->field = $field;
	}

	public function getApiErrorCode()
	{
		return $this->apiErrorCode;
	}

	public function getField()
	{
		return $this->field;
	}

	public function setType($type)
	{
		$this->type = $type;
	}

	public function getType()
	{
		return $this->type;
	}
}
