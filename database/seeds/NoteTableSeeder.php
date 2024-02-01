<?php
use Illuminate\Database\Seeder;

class NoteTableSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		// Add specific seeds for unit testing
		$note1 = DB::table('note')
			->where('key', '=', 'testkey1')
			->first();
		$note2 = DB::table('note')
			->where('key', '=', 'testkey2')
			->first();
		$note3 = DB::table('note')
			->where('key', '=', 'testkey3')
			->first();
		$color_red = DB::table('note')
			->where('key', '=', 'color_red')
			->first();
		$color_white = DB::table('note')
			->where('key', '=', 'color_white')
			->first();

		if (empty($note1)) {
			DB::table('note')->insert([
				'key' => 'testkey1',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($note2)) {
			DB::table('note')->insert([
				'key' => 'testkey2',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($note3)) {
			DB::table('note')->insert([
				'key' => 'testkey3',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($color_red)) {
			DB::table('note')->insert([
				'key' => 'color_red',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		if (empty($color_white)) {
			DB::table('note')->insert([
				'key' => 'color_white',
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);
		}

		// Start Seeding real note keys
		$noteJson = json_decode(file_get_contents(dirname(__FILE__) . '/data/note.json'), true);

		foreach ($noteJson['keys'] as $key) {
			$note = DB::table('note')
				->where('key', '=', $key)
				->first();
			if (empty($note)) {
				DB::table('note')->insert([
					'key' => $key,
					'created_at' => date('Y-m-d H:i:s'),
					'updated_at' => date('Y-m-d H:i:s'),
				]);
			}
		}

		// factory(App\Models\Note::class, 10)->create();
	}
}
