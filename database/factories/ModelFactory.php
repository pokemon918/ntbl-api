<?php
/*
|--------------------------------------------------------------------------
| Model Factories
|--------------------------------------------------------------------------
|
| Here you may define all of your model factories. Model factories give
| you a convenient way to create models for testing and seeding your
| database. Just tell the factory how a default model should look.
|
*/
use App\Helpers\StringHelper;

$factory->define(App\User::class, function (Faker\Generator $faker) {
	return ['name' => $faker->name, 'email' => $faker->email];
});

$factory->define(App\Models\Note::class, function ($faker) {
	return ['key' => $faker->word() . StringHelper::randomHex()];
});

$factory->define(App\Models\Lang::class, function ($faker) {
	return ['key' => $faker->word() . StringHelper::randomHex()];
});

$factory->define(App\Models\L18n::class, function ($faker) {
	return [
		'lang_id' => $faker->numberBetween(1, 10),
		'val' => $faker->word(),
		'ref' => StringHelper::readableRefGenerator(
			config('app.identity.refLength'),
			'l18n',
			'ref'
		),
	];
});

$factory->define(App\Models\NoteL18n::class, function ($faker) {
	return ['note_id' => $faker->numberBetween(1, 10), 'l18n_id' => $faker->numberBetween(1, 10)];
});
