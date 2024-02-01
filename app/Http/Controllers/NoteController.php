<?php
namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use App\Models\Lang;
use App\Models\L18n;
use App\Models\Note;
use App\Models\NoteL18n;
use App\Helpers\AutoNote;
use App\Helpers\StringHelper;
use App\Helpers\AutoNoteTemplates;
use App\Helpers\ValidationHelper;
use App\Helpers\Commons;
use App\Services\ImpressionService;

class NoteController extends Controller
{
	const MODEL = 'App\Models\Note';

	private $invalidParams = '/[^a-z0-9_]/';
	private $nonPrintableAndHtmlTags = '/[<>\x00-\x1F]/';
	private $noteToAdd = null;
	private $errorType = 'note';
	private $errorMessage = '';
	private $errorKey = '';
	private $errorField = '';

	public function __construct()
	{
		parent::__construct();
		$this->refLength = config('app.identity.refLength');
		$this->impressionService = new ImpressionService();
	}

	public function getRawValidNotes()
	{
		try {
			// Raw route to return full data for notes. Used for unit testing
			$notes = Note::select()->get();
			return $notes;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getValidNotes()
	{
		try {
			// todo: add validation and pagination later
			$notes = Note::where('deprecated', '=', false)
				->get()
				->pluck('key');
			return $notes;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getByKey($key)
	{
		try {
			$key = strtolower($key);
			$this->validateKey($key);
			$note = Note::getNoteByKey($key);
			$this->validateNote($note, $key);

			$noteKey = $note->key;
			$noteL18ns = $note->noteL18ns;
			$langL18nCombinedArr = [];

			foreach ($noteL18ns as $noteL18n) {
				$langL18nCombinedArr[] = [
					'lang_key' => $noteL18n->l18n->lang->key,
					'val' => $noteL18n->l18n->val,
				];
			}

			return [
				'status' => 'success',
				'note_key' => $key,
				'lang' => $langL18nCombinedArr,
			];
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function getNotes(Request $request)
	{
		try {
			$payload = Commons::prepareData($request->post());
			$keys = Commons::getProperty($payload, 'keys', []);
			$languages = Commons::getProperty($payload, 'languages', []);
			$notes = Note::getNotesByKeys($keys);
			$data = [];

			// Language Builder
			$languagesDB = Lang::whereIn('key', $languages)
				->pluck('key')
				->toArray();
			foreach ($languages as $language) {
				if (in_array($language, $languagesDB)) {
					$data[$language] = null;
				}
			}

			// Note Builder
			foreach ($notes as $note) {
				$noteKey = $note->key;
				$noteL18ns = $note->noteL18ns;

				foreach ($noteL18ns as $noteL18n) {
					$langKey = $noteL18n->l18n->lang->key;
					$value = $noteL18n->l18n->val;
					if (in_array($langKey, $languages)) {
						$data[$langKey][$noteKey] = $value;
					}
				}
			}

			$data = [
				'status' => 'success',
				'data' => $data,
			];

			return $data;
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function addNote($key, Request $request)
	{
		$key = strtolower($key);
		$langArr = $request->post();

		try {
			// Validate the key and payload before making any changes
			$this->validateKeyAndPayload($key, $langArr);

			// Get Note by key
			$this->noteToAdd = Note::where('key', '=', $key)->first();

			// If the key doesn't exist yet, create a note entry for it; Else proceed
			if (empty($this->noteToAdd)) {
				$newNote = new Note();
				$newNote->key = $key;
				$newNote->save();
				$this->noteToAdd = $newNote;
				$notes[] = $this->noteToAdd;
			}

			$this->noteToAdd->makeHidden('id');
			$this->saveLang($langArr);

			return $this->success('Note created!', Response::HTTP_CREATED, [
				'note' => $this->noteToAdd,
				'lang' => $langArr,
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function parseNotes(Request $request)
	{
		try {
			$payload = $request->post();
			$this->validateNotePayload($payload);
			$lang = Commons::getProperty($payload, 'lang');
			$notes = Commons::getProperty($payload, 'notes');
			$templateIndex = Commons::getProperty($payload, 'template');
			$autoNote = $this->buildTastingNote($lang, $notes, $templateIndex);

			// Base Data
			$data = [
				'status' => 'success',
				'missing' => $autoNote['missing'],
				'message' => $autoNote['message'],
			];

			// Add development tools for variable, grammar and spelling
			if (DEV) {
				$data['rawMessage'] = $autoNote['templateRaw'];
				$data['rawIndex'] = $autoNote['templateIndex'];
			}

			return $this->respond(Response::HTTP_OK, $data);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function deprecateNotes(Request $request)
	{
		try {
			$payload = $request->post();
			$notes = Commons::getProperty($payload, 'notes', []);
			$validNotesFromDB = Note::whereIn('key', $notes);
			$this->validateNotes($notes, $validNotesFromDB->get());
			$validNotesFromDB->update(['deprecated' => true]);

			return $this->respond(Response::HTTP_OK, [
				'status' => 'success',
				'message' => 'Successfully deprecated the notes',
				'data' => [
					'deprecated_notes' => $validNotesFromDB->get()->makeHidden('id'),
				],
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	public function activateNotes(Request $request)
	{
		try {
			$payload = $request->post();
			$notes = Commons::getProperty($payload, 'notes', []);
			$validNotesFromDB = Note::whereIn('key', $notes);
			$this->validateNotes($notes, $validNotesFromDB->get());
			$validNotesFromDB->update(['deprecated' => false]);

			return $this->respond(Response::HTTP_OK, [
				'status' => 'success',
				'message' => 'Successfully activated the notes',
				'data' => [
					'activated_notes' => $validNotesFromDB->get()->makeHidden('id'),
				],
			]);
		} catch (Exception $e) {
			return $this->error($e, $this->errorType);
		}
	}

	private function buildTastingNote($langKey, $rawNotes, $templateIndex)
	{
		// Result Containers Initialization
		$translations = [];
		$translations['nose_'] = [];
		$translations['palate_'] = [];
		$missingNotes = [];

		// Get Lang Object from validated langKey
		$lang = Lang::where('key', '=', $langKey)->first();

		foreach ($rawNotes as $note) {
			$baseCategory = AutoNote::getBaseCategory($note);
			$baseNote = AutoNote::getBaseNote($note);
			$noteDB = Note::getNoteByKey($baseNote);

			// Mark as missing when note key doesn't exist
			if (empty($noteDB)) {
				$missingNotes[] = $note;
				continue;
			}

			$noteKey = $noteDB->key;
			$noteL18ns = $noteDB->noteL18ns;
			$translationFound = false;

			// Match Translations
			foreach ($noteL18ns as $noteL18n) {
				$noteLang = $noteL18n->l18n->lang->key;
				if ($langKey == $noteLang) {
					$translationFound = true;
					$translation = strtolower($noteL18n->l18n->val);

					if (AutoNote::isNoseNote($note)) {
						$translations['nose_'][] = $translation;
						continue;
					}

					if (AutoNote::isPalateNote($note)) {
						$translations['palate_'][] = $translation;
						continue;
					}

					$translations[$baseCategory] = $translation;
					continue;
				}
			}

			// Mark as missing when translation value isn't available
			if (!$translationFound) {
				$missingNotes[] = $note;
			}
		}

		$templateIndex = AutoNote::getRawTemplateIndex($templateIndex);
		$template = AutoNote::getTemplateByIndex($templateIndex);
		$translations['nose_'] = AutoNote::roundUpNotes($translations['nose_']);
		$translations['palate_'] = AutoNote::roundUpNotes($translations['palate_']);
		$message = StringHelper::formatWhiteSpaces(
			AutoNote::renderTranslations($template, $translations)
		);

		return [
			'message' => $message,
			'missing' => $missingNotes,
			'templateRaw' => $template,
			'templateIndex' => $templateIndex,
		];
	}

	private function validateNotePayload($payload)
	{
		ValidationHelper::validatePayload($payload);

		// Validate Lang
		$lang = Commons::getProperty($payload, 'lang');
		$this->validateLangPayload($lang);

		// Validate Notes
		$notes = Commons::getProperty($payload, 'notes');
		$this->validateNotes($notes);

		// Validate Optional Template Index
		$templateIndex = Commons::getProperty($payload, 'template');
		$this->validateTemplateIndex($templateIndex);
	}

	private function validateNote($note, $key)
	{
		if (empty($note)) {
			$this->fail(
				'Note not found!',
				$this->errorCodes['invalid_note'],
				'key',
				__FILE__,
				__LINE__,
				['key' => $key]
			);
		}
	}

	private function validateLangPayload($lang)
	{
		if (empty($lang)) {
			$this->fail(
				'Lang is empty or invalid',
				$this->errorCodes['invalid_lang'],
				'lang',
				__FILE__,
				__LINE__
			);
		}

		if ($lang !== 'en') {
			$this->fail(
				'Lang is not supported',
				$this->errorCodes['invalid_lang'],
				'lang',
				__FILE__,
				__LINE__,
				[
					'lang' => $lang,
				]
			);
		}
	}

	private function validateNotes($notes, $validNotesFromDB = null)
	{
		if (empty($notes)) {
			$this->fail(
				'Notes is empty or invalid',
				$this->errorCodes['invalid_note'],
				'notes',
				__FILE__,
				__LINE__
			);
		}

		if (!empty($validNotesFromDB)) {
			$this->impressionService->checkForNonExistingNoteKeys($notes, $validNotesFromDB);
		}
	}

	private function validateTemplateIndex($templateIndex)
	{
		if (empty($templateIndex)) {
			return;
		}

		$templates = AutoNoteTemplates::templates();
		$templateCtr = sizeof($templates);
		$templateIndex = $templateIndex <= 0 ? $templateIndex : $templateIndex - 1;

		if (!is_numeric($templateIndex)) {
			$this->fail(
				'Template Index is invalid',
				$this->errorCodes['invalid_template'],
				'template',
				__FILE__,
				__LINE__
			);
		}

		if (!array_key_exists($templateIndex, $templates) && $templateIndex !== -1) {
			$message =
				'Template [' .
				($templateIndex > 0 ? $templateIndex + 1 : $templateIndex) .
				'] not found. ';
			$message .= $templateCtr > 0 ? "Please select from 1-{$templateCtr}" : '';
			$this->fail(
				$message,
				$this->errorCodes['invalid_template'],
				'template',
				__FILE__,
				__LINE__
			);
		}
	}

	private function validateKey($key, $length = 20)
	{
		$note = ['key' => trim($key)];
		$notesValidator = Validator::make(
			$note,
			['key' => Note::$rules['key']],
			$this->ruleMessages
		);

		$this->checkValidatorForErrors(
			$notesValidator,
			$this->errorMessage,
			$this->errorKey,
			$this->errorField,
			[
				'key' => $key,
				'length' => strlen($key),
				'rules' => Note::$rules['key'],
			]
		);
	}

	private function validateKeyAndPayload($key, $langArr)
	{
		$this->validateKey($key);

		foreach ($langArr as $langItem) {
			$lang = [
				'lang_key' => trim($langItem['lang_key']),
				'l18n_value' => $langItem['value'],
			];

			$rules = [
				'lang_key' => Lang::$rules['key'],
				'l18n_value' => L18n::$rules['val'],
			];

			$langValidator = Validator::make($lang, $rules, $this->ruleMessages);

			$this->checkValidatorForErrors(
				$langValidator,
				$this->errorMessage,
				$this->errorKey,
				$this->errorField,
				[
					'lang_key' => $langItem['lang_key'],
					'l18n_value' => $langItem['value'],
					'lang_key_rules' => Lang::$rules['key'],
					'l18n_value_rules' => L18n::$rules['val'],
				]
			);
		}
	}

	private function saveLang($langArr)
	{
		if (empty($langArr)) {
			return;
		}

		foreach ($langArr as $langItem) {
			$lang = Lang::where('key', '=', $langItem['lang_key'])->first();
			$this->validateLanguage($lang, $langItem['lang_key']);
			$l18n = $this->saveL18n($lang->id, $langItem['value']);
			$this->saveNoteL18n($this->noteToAdd->id, $l18n->id);
		}
	}

	private function saveL18n($langID, $val)
	{
		// Get L18n by lang_id and val;
		$l18n = L18n::where([['lang_id', '=', $langID], ['val', '=', $val]])->first();

		if ($l18n) {
			return $l18n;
		}

		// Create L18n if not existing
		$newL18n = new L18n();
		$newL18n->ref = StringHelper::readableRefGenerator($this->refLength, 'l18n', 'ref');
		$newL18n->lang_id = $langID;
		$newL18n->val = $val;
		$newL18n->save();

		return $newL18n;
	}

	private function saveNoteL18n($noteID, $l18nID)
	{
		// Get NoteL18n by note_id and l18n_id;
		$noteL18n = NoteL18n::where([
			['note_id', '=', $noteID],
			['l18n_id', '=', $l18nID],
		])->first();

		if ($noteL18n) {
			return $noteL18n;
		}

		// Create NoteL18n if not existing
		$newNoteL18n = new NoteL18n();
		$newNoteL18n->note_id = $noteID;
		$newNoteL18n->l18n_id = $l18nID;
		$newNoteL18n->save();
		return $noteL18n;
	}

	private function validateLanguage($lang, $langKey)
	{
		if (empty($lang)) {
			$this->fail(
				'Language not found!',
				$this->errorCodes['invalid_lang'],
				'lang_key',
				__FILE__,
				__LINE__,
				['lang_key' => $langKey]
			);
		}
	}
}
