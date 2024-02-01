<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Origin;
use App\Models\Subject;
use App\Models\Individual;
use App\Models\Stats;
use App\Models\Rating;
use App\Models\ImpressionNote;
use App\Models\ImpressionInfo;
use App\Models\ImpressionInfoType;
use App\Models\Note;
use App\Models\Collection;
use App\Models\Fkey;
use App\Helpers\StringHelper;
use App\Helpers\Commons;
use App\Traits\ClientTime;

class Impression extends Model
{
	use SoftDeletes;
	use ClientTime;

	protected $table = 'impression';
	protected $fillable = [
		'ref',
		'lifecycle_id',
		'origin_id',
		'owner_ref',
		'impression_type_id',
		'collection_id',
		'created_ct',
		'updated_ct',
		'deleted_ct',
	];
	public static $rules = [
		'ref' => 'unique:impression,ref|max:255|valid_ref',
		'lifecycle_id' => 'integer',
		'origin_id' => 'integer',
		'owner_ref' => 'max:64|valid_ref',
		'impression_type_id' => 'integer',
		'collection_id' => 'integer',
		'metadata' => 'nullable|valid_hjson',
		'notes' => 'nullable|max:12',
		'created_ct' => 'date|after:1970-01-01',
		'updated_ct' => 'date|after:1970-01-01',
		'deleted_ct' => 'date|after:1970-01-01',
		'mold' => 'nullable|valid_ref|exists:impression,ref',
	];
	public $hidden = ['created_ct', 'updated_ct', 'deleted_ct'];

	public static function getByImpressionAndOwnerRef($impressionRef, $userRef)
	{
		return Impression::with([
			'subject',
			'individual',
			'rating',
			'impressionNotes.note',
			'collection',
			'impressionFiles.file',
		])
			->where([['ref', '=', $impressionRef], ['owner_ref', '=', $userRef]])
			->whereNull('deleted_at')
			->first();
	}

	public static function getByOwnerRef($userRef)
	{
		return Impression::with([
			'origin',
			'subject',
			'individual',
			'rating',
			'infos',
			'impressionNotes.note',
			'impressionFiles.file',
			'collection',
			'team',
		])
			->where([['impression_type_id', '=', 1], ['owner_ref', '=', $userRef]])
			->whereNull('deleted_at')
			->orderby('created_at', 'DESC')
			->get();
	}

	public function getMetadataAttribute($value)
	{
		return json_decode($value);
	}

	// Relationships
	public function lifecycle()
	{
		return $this->belongsTo('App\Models\Lifecycle');
	}

	public function impressionType()
	{
		return $this->belongsTo('App\Models\ImpressionType');
	}

	public function origin()
	{
		return $this->belongsTo('App\Models\Origin');
	}

	public function collection()
	{
		return $this->belongsTo('App\Models\Collection');
	}

	public function team()
	{
		return $this->belongsTo('App\Models\Team', 'team_id');
	}

	public function subject()
	{
		return $this->belongsTo('App\Models\Subject');
	}

	public function individual()
	{
		return $this->hasOne('App\Models\Individual', 'impression_id');
	}

	public function stats()
	{
		return $this->hasMany('App\Models\Stats', 'impression_id');
	}

	public function rating()
	{
		return $this->hasOne('App\Models\Rating', 'impression_id');
	}

	public function impressionNotes()
	{
		return $this->hasMany('App\Models\ImpressionNote', 'impression_id');
	}

	public function collectionImpressions()
	{
		return $this->hasMany('App\Models\CollectionImpression', 'impression_id');
	}

	public function impressionFiles()
	{
		return $this->hasMany('App\Models\ImpressionFile', 'impression_id');
	}

	public function owner()
	{
		return $this->hasOne('App\Models\User', 'ref', 'owner_ref');
	}

	public function infos()
	{
		return $this->hasMany('App\Models\ImpressionInfo', 'impression_id');
	}

	public function moldedImpressions()
	{
		return $this->hasMany('App\Models\Impression', 'mold', 'ref');
	}

	public function fkey()
	{
		return $this->hasOne('App\Models\Fkey', 'fkey_id');
	}

	#region Database
	public function saveOrigin($rawOrigin, $updateExisting = false)
	{
		if (empty($rawOrigin)) {
			return null;
		}

		// If the tasting to update has the initial origin id of zero, create a new origin instead of updating it
		if ($updateExisting) {
			if ($this->origin_id == 0) {
				$origin = new Origin();
			} else {
				$origin = Origin::where('id', '=', $this->origin_id)->first();
			}
		} else {
			$origin = new Origin();
		}

		$rawOrigin = explode('/', $rawOrigin, 3);
		$origin->flow = isset($rawOrigin[0]) ? trim($rawOrigin[0]) : '';
		$origin->client = isset($rawOrigin[1]) ? trim($rawOrigin[1]) : '';
		$origin->version = isset($rawOrigin[2]) ? trim($rawOrigin[2]) : '';
		$origin->save();

		if ($origin) {
			$this->origin_id = $origin->id;
		}

		return $origin;
	}

	public function saveSubject($rawSubject, $updateExisting = false)
	{
		if (empty($rawSubject)) {
			return null;
		}

		if ($updateExisting) {
			$subject = Subject::where('id', '=', $this->subject_id)->first();
		} else {
			$subject = new Subject();
		}

		if (isset($rawSubject['name'])) {
			$subject->name = Commons::getProperty($rawSubject, 'name');
		}

		$subject->producer = Commons::getProperty($rawSubject, 'producer');
		$subject->country = Commons::getProperty($rawSubject, 'country');
		$subject->region = Commons::getProperty($rawSubject, 'region');
		$subject->vintage = Commons::getProperty($rawSubject, 'vintage');
		$subject->grape = Commons::getProperty($rawSubject, 'grape');
		$subject->price = Commons::getProperty($rawSubject, 'price');
		$subject->currency = Commons::getProperty($rawSubject, 'currency');
		$subject->clean_key = Commons::getProperty($rawSubject, 'clean_key');
		$subject->producer_key = Commons::getProperty($rawSubject, 'producer_key');
		$subject->country_key = Commons::getProperty($rawSubject, 'country_key');
		$subject->region_key = Commons::getProperty($rawSubject, 'region_key');
		$subject->save();

		return $subject;
	}

	public function saveIndividual($rawIndividual, $updateExisting = false)
	{
		if (empty($rawIndividual)) {
			return null;
		}

		if ($updateExisting) {
			$individual = individual::where('impression_id', '=', $this->id)->first();
		} else {
			$individual = new Individual();
			$individual->impression_id = $this->id;
		}

		if (isset($rawIndividual['summary_wine'])) {
			$individual->summary_wine = Commons::convertHTMLToEntities(
				Commons::getProperty($rawIndividual, 'summary_wine')
			);
		}

		if (isset($rawIndividual['summary_personal'])) {
			$individual->summary_personal = Commons::convertHTMLToEntities(
				Commons::getProperty($rawIndividual, 'summary_personal')
			);
		}

		if (isset($rawIndividual['food_pairing'])) {
			$individual->food_pairing = Commons::convertHTMLToEntities(
				Commons::getProperty($rawIndividual, 'food_pairing')
			);
		}

		if (isset($rawIndividual['location'])) {
			$individual->location = Commons::getProperty($rawIndividual, 'location');
		}

		if (isset($rawIndividual['gps'])) {
			$gpsRaw = Commons::getProperty($rawIndividual, 'gps');
			$individual->lat = Commons::getProperty($gpsRaw, 'lat') ?: null;
			$individual->long = Commons::getProperty($gpsRaw, 'long') ?: null;
		}

		$individual->save();

		return $individual;
	}

	public function saveStats($rawStats)
	{
		if (empty($rawStats)) {
			return null;
		}

		$statsArr = [];

		foreach ($rawStats as $statObj) {
			$key = key($statObj);
			$val = floatval($statObj[$key]);
			$stats = new Stats();
			$stats->impression_id = $this->id;
			$stats->event = trim($key);
			$stats->value = $val;
			$stats->save();
			$statsArr[] = $stats;
		}

		return $statsArr;
	}

	public function updateStats($rawStats)
	{
		if (empty($rawStats)) {
			return null;
		}

		$statsArr = [];

		foreach ($rawStats as $statObj) {
			$key = trim(key($statObj));
			$val = floatval($statObj[$key]);

			// Check if a stat with the exact same event and value already exists. If yes, then skip and don't add
			$stats = Stats::where([
				['impression_id', '=', $this->id],
				['event', '=', $key],
				['value', '=', $val],
			])->first();

			if (!empty($stats)) {
				continue;
			}

			$stats = new Stats();
			$stats->impression_id = $this->id;
			$stats->event = $key;
			$stats->value = $val;
			$stats->save();
			$statsArr[] = $stats;
		}

		return $statsArr;
	}

	public function saveRating($rawRating)
	{
		if (empty($rawRating)) {
			return null;
		}

		$rating = Rating::where('impression_id', '=', $this->id)->first();

		if (empty($rating)) {
			$rating = new Rating();
			$rating->impression_id = $this->id;
		}

		$rating->version = trim(array_get($rawRating, 'version'));
		$rating->final_points = Commons::parseRating($rawRating['final_points']);
		$rating->balance = Commons::parseRating($rawRating['balance']);
		$rating->length = Commons::parseRating($rawRating['length']);
		$rating->intensity = Commons::parseRating($rawRating['intensity']);
		$rating->terroir = Commons::parseRating($rawRating['terroir']);
		$rating->complexity = Commons::parseRating($rawRating['complexity']);
		$rating->save();

		return $rating;
	}

	public function saveImpressionNotes($rawNotes)
	{
		if (empty($rawNotes)) {
			return null;
		}

		$impressionNotesByType = [];

		foreach ($rawNotes as $type => $noteKeys) {
			$impressionNotesByType = array_merge(
				$impressionNotesByType,
				$this->saveNotes($type, $noteKeys)
			);
		}

		return $impressionNotesByType;
	}

	public function saveNotes($type, $noteKeys)
	{
		if (empty($type) || empty($noteKeys)) {
			return [];
		}

		// Clear old notes
		$oldNotes = ImpressionNote::where([
			['impression_id', $this->id],
			['type', $type],
		])->delete();

		// Save new notes
		$savedImpressionNotes = [];
		$noteKeys = array_map('trim', $noteKeys);
		$notes = Note::whereIn('key', $noteKeys)->get();
		$noteIds = $notes->pluck('id')->toArray();

		foreach ($notes as $note) {
			$impressionNote = new ImpressionNote();
			$impressionNote->impression_id = $this->id;
			$impressionNote->note_id = $note->id;
			$impressionNote->type = $type;
			$impressionNote->save();
			$savedImpressionNotes[$type][] = $impressionNote;
		}

		return $savedImpressionNotes;
	}

	public function saveOriginCollection($collectionRef)
	{
		if (!empty($collectionRef)) {
			$collection = Collection::where([['ref', '=', $collectionRef]])->first();
			$this->collection_id = $collection->id;
		}
	}

	public function saveImpressionInfo($infos)
	{
		if (empty($infos)) {
			return null;
		}

		// Clear all previous info
		ImpressionInfo::where('impression_id', $this->id)->delete();

		// Save Impression Infos
		foreach ($infos as $infoKey => $value) {
			$destination = is_float($value) || is_numeric($value) ? 'value' : 'info';
			$value = is_float($value) || is_numeric($value) ? Commons::parseRating($value) : $value;

			$impressionInfo = new ImpressionInfo([
				'impression_id' => $this->id,
				'field' => $infoKey,
				$destination => $value,
			]);

			$impressionInfo->save();
		}
	}

	public function saveImpressionFkey($fkey)
	{
		// If the whole data package is empty
		if (empty($fkey) || empty(json_decode($fkey, true))) {
			return null;
		}

		// Sanitize Json
		$fkeyJsonObj = json_decode($fkey);
		$fkeyJsonArr = get_object_vars($fkeyJsonObj);

		$fkeyDB = new Fkey();
		$fkeyDB->origin = $fkeyJsonArr['origin'];
		$fkeyDB->subject_key = $fkeyJsonArr['subject_key'];

		if (isset($fkeyJsonArr['event_key']) && !empty(trim($fkeyJsonArr['event_key']))) {
			$fkeyDB->event_key = $fkeyJsonArr['event_key'];
		}

		if (isset($fkeyJsonArr['client_key']) && !empty(trim($fkeyJsonArr['client_key']))) {
			$fkeyDB->client_key = $fkeyJsonArr['client_key'];
		}

		if (isset($fkeyJsonArr['producer_key']) && !empty(trim($fkeyJsonArr['producer_key']))) {
			$fkeyDB->producer_key = $fkeyJsonArr['producer_key'];
		}

		$fkeyDB->save();

		// Save Impression Fkey Reference
		$this->fkey_id = $fkeyDB->id;
		$this->save();
	}

	#endregion
}
