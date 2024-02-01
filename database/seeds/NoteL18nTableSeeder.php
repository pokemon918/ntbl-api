<?php
use Illuminate\Database\Seeder;
use Symfony\Component\Console\Output\ConsoleOutput;
use App\Helpers\DBHelper;

class NoteL18nTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		// Test Translations
		$note_l18n1 = DB::table('note_l18n')
			->where([['note_id', '=', 1], ['l18n_id', '=', 3]])
			->first();
		$note_l18n2 = DB::table('note_l18n')
			->where([['note_id', '=', 2], ['l18n_id', '=', 2]])
			->first();
		$note_l18n3 = DB::table('note_l18n')
			->where([['note_id', '=', 3], ['l18n_id', '=', 1]])
			->first();

		if (empty($note_l18n1)) {
			DB::table('note_l18n')->insert([
				'note_id' => 1,
				'l18n_id' => 3,
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($note_l18n2)) {
			DB::table('note_l18n')->insert([
				'note_id' => 2,
				'l18n_id' => 2,
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($note_l18n3)) {
			DB::table('note_l18n')->insert([
				'note_id' => 3,
				'l18n_id' => 1,
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		// Real Translations
		$files = scandir(__DIR__ . '/data/note_l18n');
		if (!empty($files)) {
			$console = new ConsoleOutput();
			foreach ($files as $file) {
				if (!in_array($file, ['.', '..'])) {
					$langKey = pathinfo($file, PATHINFO_FILENAME);
					$console->writeln('NoteL18nTableSeeder: ' . strtoupper($langKey));
					$filePath = file_get_contents(dirname(__FILE__) . '/data/note_l18n/' . $file);
					$l18ns = json_decode($filePath, true);
					$lang = DBHelper::ensureLanguage($langKey);

					foreach ($l18ns as $key => $value) {
						$note = DBHelper::ensureNote($key);
						$l18n = DBHelper::ensureL18N($lang->id, $value);
						$notel18n = DBHelper::ensureNoteL18N($note->id, $l18n->id);
					}
				}
			}
		}
	}
}
