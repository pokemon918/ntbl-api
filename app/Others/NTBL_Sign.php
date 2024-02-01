<?php
namespace App\Others;

use kornrunner\Keccak;
use Exception;

class NTBL_Sign
{
	public static function hmac_sha256($msg, $hpass)
	{
		if (empty($msg) || empty($hpass)) {
			throw new Exception("Can't create a hash. Invalid string", __LINE__);
		}

		return hash_hmac('sha256', $msg, $hpass);
	}

	public static function sha3_shake256($msg, $length = 72)
	{
		return self::sha3_shake($msg, 256, $length);
	}

	public static function sha256d($str)
	{
		return self::sha256(self::sha256($str));
	}

	public static function pbkdf2_sha256($password, $salt, $iterations)
	{
		// string hash_pbkdf2 ( string $algo , string $password , string $salt , int $iterations [, int $length = 0 [, bool $raw_output = FALSE ]] )
		return hash_pbkdf2('sha256', $password, $salt, $iterations);

		// return self::sha256(self::sha256($str));
	}

	public static function sha256($str)
	{
		return hash('sha256', $str);
	}

	private static function sha3_shake($msg, $algo, $length)
	{
		return Keccak::shake($msg, $algo, $length);
	}

	public static function md5($str)
	{
		return md5(strtolower(trim($str)));
	}
}
