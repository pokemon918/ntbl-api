<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
	protected $table = 'voucher';
	protected $fillable = ['parent_coupon', 'code', 'subscription_id', 'valid_days'];

	public $hidden = ['id'];

	public static $rules = [
		'parent_coupon' => 'required|string|max:6|valid_ref',
		'code' => 'required|string|max:20|valid_voucher_code|unique:voucher,code',
		'subscription_id' => 'required|numeric',
		'valid_days' => 'required|min:-1|max:999|numeric',
		'usage_limit' => 'nullable|min:-1|numeric',
	];

	public function subscription()
	{
		return $this->belongsTo('App\Models\UserSubscription');
	}
}
