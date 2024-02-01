<?php
namespace App\Helpers;

use App\Helpers\ValidationHelper;
use DateTime;

class DateHelper
{
	public static function getHoursDiff($timestamp)
	{
		$how_log_ago = '';
		$currentTstamp = (microtime(1) * 1000) | 0;
		$timeDiff = $currentTstamp - $timestamp;
		$seconds = $timeDiff / 1000;
		$minutes = (int) ($seconds / 60);
		$hours = (int) ($minutes / 60);
		$days = (int) ($hours / 24);

		return $hours;
	}

	/*
		Alternative function to check difference in dates	 
		It that takes two timestamp and uses DateTime to compare
	*/

	public static function getDateDiff($timeStamp1, $timeStamp2)
	{
		$date1 = new DateTime();
		$date1->setTimestamp($timeStamp1);

		$date2 = new DateTime();
		$date2->setTimestamp($timeStamp2);

		$diff = $date2->diff($date1);

		$hours = $diff->h;
		$mins = $diff->i;
		$totalDiff = $hours + $mins / 60;

		return $hours;
	}

	public static function isValid($timestamp)
	{
		if (!is_numeric($timestamp)) {
			return false;
		}

		// Make sure that timestamp is not more than 30hrs old
		$hoursDiff = self::getHoursDiff($timestamp);
		if ($hoursDiff > 30) {
			return false;
		}

		return true;
	}
}
