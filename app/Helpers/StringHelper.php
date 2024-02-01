<?php
namespace App\Helpers;

use Illuminate\Support\Facades\Log;
use App\Helpers\ValidationHelper;

class StringHelper
{
	private static $nogoWords = [];

	/**
	 * Generates readable reference based on accepted words
	 * @param int $size - determines the length of the resulting ref
	 * @param string $table - table name where the existence of ref is checked against.
	 * @param string $column - column name where the existence of ref is checked against.
	 * @return string $string - represents the generated ref
	 */
	public static function readableRefGenerator(
		$size,
		$table,
		$column,
		$retries = 0,
		$generatedRefs = []
	) {
		$firstChars = 'ABCDEFGHKLMNPQRSTXYZ';
		$allChars = $firstChars . '23456789';

		// Generate the ref string and check if it contains a bad word
		do {
			$string = $firstChars[mt_rand(0, strlen($firstChars) - 1)];

			for ($i = 1; $i < (int) $size; $i++) {
				$string .= $allChars[mt_rand(0, strlen($allChars) - 1)];
			}
		} while (self::hasBadWord($string));

		$doesValueExists = ValidationHelper::doesValueExists($string, $table, $column);
		$maxRetries = 100;

		// Repeat process if ref already exists...
		while ($doesValueExists == true) {
			// Throw an error if API reached the maximum retries for generating unique ref
			if ($retries >= $maxRetries) {
				// Override raw sql failure
				ValidationHelper::fail(
					'An internal timeout has occured. Please try again.',
					'unexpected',
					$column,
					__FILE__,
					__LINE__,
					[
						'retries' => $retries,
						'maxRetries' => $maxRetries,
					]
				);
			}

			// Increment while we still can
			$retries++;

			// Add to list of regenerated refs during retry
			$generatedRefs[] = $string;

			// Log how many times we retry
			Log::info('Ref Generation Retry', [
				'ref_attempt' => $string,
				'ref_retry_count' => $retries,
				'refs_generated' => $generatedRefs,
			]);

			self::readableRefGenerator($size, $table, $column, $retries, $generatedRefs);
		}

		return strtolower($string);
	}

	public static function randomHex($byteLength = 5)
	{
		$bytes = random_bytes($byteLength);
		$hex = bin2hex($bytes);
		return $hex;
	}

	public static function hasBadWord($string)
	{
		/*
			Description:
			if any line from nogo.words.txt is present in $string return true
			else return false
		*/
		if (empty(self::$nogoWords)) {
			self::$nogoWords = file(__DIR__ . '/../../config/nogo.words.txt');
		}

		foreach (self::$nogoWords as $word) {
			if (strpos($string, $word) !== false) {
				return true;
			}
		}

		return false;
	}

	public static function replaceWithOwnTerms($string, $term)
	{
		$ownTerms = config('app.ownTerms');

		foreach ($ownTerms as $toReplace => $replacement) {
			$string = str_replace($toReplace, $replacement, $string);
			$string = str_replace(ucfirst($toReplace), ucfirst($replacement), $string);
		}

		return $string;
	}

	public static function formatWhiteSpaces($string)
	{
		return trim(preg_replace('/\s\s+/', ' ', $string));
	}
}
