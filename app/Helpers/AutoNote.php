<?php
namespace App\Helpers;

use Exception;
use Mustache_Engine;
use App\Helpers\AutoNoteTemplates;

class AutoNote
{
	public static function ref2ShortName($ref)
	{
		// Transforms "x_y" into "X y"
		$ref = self::ref2name($ref);

		// Transforms "X y" into "y"
		$name = preg_replace('/^[^ ]+ /i', '', $ref);

		// Transforms "medium p/m" into "medium plus/minus"
		$name = str_replace('medium p', 'medium plus', $name);
		$name = str_replace('medium m', 'medium minus', $name);

		return $name;
	}

	public static function ref2name($ref, $remove = '')
	{
		$ref = str_replace($remove, '', $ref);
		$ref = str_replace('_', ' ', $ref);
		$ref = trim($ref);
		$ref = ucfirst($ref);
		return $ref;
	}

	public static function roundUpNotes($refs)
	{
		if (count($refs) > 1) {
			$last = array_pop($refs);
		}

		$roundUp = join(', ', $refs);

		if (isset($last)) {
			$roundUp .= ' and ' . $last;
		}

		return $roundUp;
	}

	public static function getRandomTemplate()
	{
		$templates = AutoNoteTemplates::templates();
		return $templates[array_rand($templates)];
	}

	public static function getTemplateByIndex($templateIndex)
	{
		$templates = AutoNoteTemplates::templates();
		$templateCtr = sizeof($templates);

		if ($templateIndex === -1) {
			return self::getAllTemplatesAsString($templates, $templateCtr);
		}

		if (array_key_exists($templateIndex, $templates)) {
			return $templates[$templateIndex];
		}

		$message = 'Template [' . ($templateIndex + 1) . '] not found. ';
		$message .= $templateCtr > 0 ? "Please select from 1-{$templateCtr}" : '';
		return $message;
	}

	public static function getAllTemplatesAsString($templates, $templateCtr)
	{
		$templateBuilder = null;
		foreach ($templates as $index => $template) {
			// Add user-friendly index
			$templateBuilder = $templateBuilder . ($index + 1) . ':';

			// Add template itself
			$templateBuilder = $templateBuilder . $templates[$index];

			// Add separator
			$templateBuilder = $templateBuilder . "\r\n----\r\n";
		}

		return $templateBuilder;
	}

	public static function getRawTemplateIndex($index)
	{
		if (empty($index)) {
			return array_rand(AutoNoteTemplates::templates());
		}

		return $index === -1 ? $index : $index - 1;
	}

	public static function renderTranslations($template, $translations)
	{
		if (empty($template) || empty($translations)) {
			return;
		}

		$mustache = new Mustache_Engine();
		$message = $mustache->render($template, $translations);
		$message = self::getNounMarker($message);
		return $message;
	}

	public static function getNounMarker($message)
	{
		if (empty($message)) {
			return;
		}

		// Make sure we return "An off-dry wine" instead of "A off-dry wine"
		return preg_replace('/(\ba)( [aeiouy])/mi', '$1n$2', $message);
	}

	public static function isNoseNote($note)
	{
		if (empty($note)) {
			return false;
		}

		return preg_match('/^nosenote_/', $note);
	}

	public static function isPalateNote($note)
	{
		if (empty($note)) {
			return false;
		}

		return preg_match('/^palatenote_/', $note);
	}

	public static function getBaseCategory($note)
	{
		if (empty($note)) {
			return;
		}

		return explode('_', $note)[0] . '_';
	}

	public static function getBaseNote($note)
	{
		$isNoseOrPalate = self::isNoseNote($note) || self::isPalateNote($note);

		if (empty($note) || !$isNoseOrPalate) {
			return $note;
		}

		if (self::isNoseNote($note)) {
			$baseNote = str_replace('nosenote_', 'note_', $note);
		}

		if (self::isPalateNote($note)) {
			$baseNote = str_replace('palatenote_', 'note_', $note);
		}

		return $baseNote;
	}
}
