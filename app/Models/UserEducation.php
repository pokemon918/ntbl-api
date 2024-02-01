<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserEducation extends Model
{
	use SoftDeletes;
	protected $table = 'user_education';
	public $hidden = ['user_id', 'country', 'country_id', 'deleted_at'];

	protected $casts = [
		'completed' => 'boolean',
	];

	protected $fillable = [
		'user_id',
		'ref',
		'school',
		'description',
		'achievement',
		'country_code',
		'year',
		'completed',
	];

	public static $rules = [
		'ref' => 'string|max:32|valid_ref',
		'school' => 'required|string|max:255',
		'description' => 'nullable|string|max:4000',
		'achievement' => 'nullable|string|max:255',
		'country_code' => 'nullable|string|max:2|exists:country,alpha2',
		'year' => 'nullable|digits:4|integer|min:1900',
		'completed' => 'nullable|boolean',
	];

	public function user()
	{
		return $this->belongsTo('App\Models\User');
	}

	public function wine_knowledge()
	{
		return $this->belongsTo('App\Models\UserWineKnowledge');
	}

	public function country()
	{
		return $this->hasOne('App\Models\Country', 'id', 'country_id');
	}

	public static function deleteByRefs($educationRefs, $user)
	{
		$educationsDB = self::whereIn('ref', $educationRefs)->where('user_id', '=', $user->id);
		$educationsDBRefs = $educationsDB->get()->pluck('ref');
		$educationsDB->delete();
		return $educationsDBRefs;
	}
}
