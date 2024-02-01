<?php
namespace App\Providers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Events\QueryExecuted;

class DbProfilerServiceProvider extends ServiceProvider
{
	private static $counter;

	private static function tickCounter()
	{
		return self::$counter++;
	}

	public function boot()
	{
		if (!$this->isEnabled()) {
			return;
		}

		self::$counter = 1;
		DB::listen(function (QueryExecuted $query) {
			$i = self::tickCounter();
			$sql = $this->applyBindings($query->sql, $query->bindings);
			echo "[$i]: {$sql}; ({$query->time} ms)";
		});
	}

	private function isEnabled()
	{
		if (PROD) {
			return false;
		}

		return request()->exists('profiler');
	}

	private function applyBindings($sql, array $bindings)
	{
		if (empty($bindings)) {
			return $sql;
		}
		foreach ($bindings as $binding) {
			switch (gettype($binding)) {
				case 'boolean':
					$binding = (int) $binding;
					break;
				case 'string':
					$binding = "'{$binding}'";
					break;
			}
			$sql = preg_replace('/\?/', $binding, $sql, 1);
		}
		return $sql;
	}
}
