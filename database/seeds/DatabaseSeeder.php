<?php
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
	/**
	 * Run the database seeds.
	 *
	 * @return void
	 */
	public function run()
	{
		$this->call('IdentityTableSeeder');
		$this->call('NoteTableSeeder');
		$this->call('LangTableSeeder');
		$this->call('L18nTableSeeder');
		$this->call('NoteL18nTableSeeder');
		$this->call('LifecycleTableSeeder');
		$this->call('OriginTableSeeder');
		$this->call('ImpressionTypeTableSeeder');
		$this->call('RelationTypeTableSeeder');
		$this->call('CollectionTypeTableSeeder');
		$this->call('CollectionAccessTypeTableSeeder');
		$this->call('TeamAccessTypeTableSeeder');
		$this->call('CountryTableSeeder');
		$this->call('UserTitleTableSeeder');
		$this->call('NoteableLevelTableSeeder');
		$this->call('CurrencyTableSeeder');
		$this->call('UserInterestTypeTableSeeder');
		$this->call('UserBadgesTableSeeder');
		$this->call('ActionTypeTableSeeder');
		$this->call('SubscriptionPlanTableSeeder');
		$this->call('UpgradeCodesSeeder');
		$this->call('ImpressionInfoValueTypeTableSeeder');
		$this->call('ImpressionInfoTypeTableSeeder');
		$this->call('TeamTypeTableSeeder');
		$this->call('VisibilitySeeder');
		$this->call('TeamAccessTypeOverrideSeeder');

		if (DEV) {
			$this->call('TestUsersSeeder');
		}
	}
}
