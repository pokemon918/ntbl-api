<?php
namespace App\Traits;

use App\Helpers\AuthHelper;

trait ClientTime
{
	protected static function boot()
	{
		parent::boot();

		static::creating(function ($model) {
			$model->created_ct = AuthHelper::getClientTime();
		});

		static::saving(function ($model) {
			$model->updated_ct = AuthHelper::getClientTime();
		});

		static::restoring(function ($model) {
			$model->deleted_ct = null;
		});

		static::deleting(function ($model) {
			$model->deleted_ct = AuthHelper::getClientTime();
			$model->save();
		});
	}
}
