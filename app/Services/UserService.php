<?php
namespace App\Services;

use Auth;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;
use App\Helpers\Commons;
use App\Helpers\FileHelper;
use App\Helpers\StringHelper;
use App\Helpers\ValidationHelper;
use App\Mail\ResetPassword;
use App\Models\File;
use App\Models\Lang;
use App\Models\Currency;
use App\Models\User;
use App\Models\UserContact;
use App\Models\UserDemographic;
use App\Models\UserLanguage;
use App\Models\UserInterest;
use App\Models\UserInterestType;
use App\Models\UserInterestRelation;
use App\Models\UserEducation;
use App\Models\UserWineKnowledge;
use App\Models\UserTitle;
use App\Models\UserBilling;
use App\Models\Address;
use App\Models\Locality;
use App\Models\Country;
use App\Models\Identity;
use App\Models\UserPreferences;
use App\Models\ActionType;
use App\Models\TeamAction;
use App\Others\NTBL_Sign;
use App\Services\SubscriptionService;
use App\Services\MailService;
// use App\Services\TeamService;

class UserService
{
	private $implementation = 'NTBL'; //Hardcoded fixed value for namespacing passwords
	private $errorMessage = '';
	private $errorKey = '';
	private $errorField = '';
	private $country = null;
	private $avatarPayloadKey = 'avatar';
	private $responseData = [];

	function __construct()
	{
		$this->refLength = config('app.identity.refLength');
		$this->refMaxLength = config('app.identity.refMaxLength');
		$this->ruleMessages = config('app.ruleMessages');
		$this->errorCodes = config('app.errorCodes');
		$this->fileRefLength = config('app.file.refLength');
		$this->emailMaxLength = config('app.identity.emailMaxLength');
		$this->resetTokenMaxLength = config('app.identity.resetTokenMaxLength');
		$this->endOfLifeStates = config('subscription.chargify.states.end_of_life');
		$this->signupTemplate = 'Signup';
		$this->resetTemplate = 'ResetPassword';
		$this->subscriptionService = new SubscriptionService();
		$this->mailService = new MailService();
	}

	public function createUser($payload)
	{
		$this->validateIdentityPayload($payload);

		$ref = StringHelper::readableRefGenerator($this->refLength, 'user', 'ref');
		ValidationHelper::validateRefOrHandleIsUnique($ref, 'user', 'ref');

		// generate secret
		$secret = $this->generateSecret($payload);

		// Create new user and set default props
		$user = new User();
		$user->ref = $ref;
		$user->handle = Commons::getProperty($payload, 'handle');
		$user->name = Commons::getProperty($payload, 'name');
		$preferences = Commons::getProperty($payload, 'preferences', null);
		$preferences['lang'] = Commons::getProperty($preferences, 'lang', 'en');
		$preferences['currency'] = Commons::getProperty($preferences, 'currency', 'USD');
		$this->saveUserPreferencesData($user, $preferences);
		$user->save();

		// Create new identity and set properties
		$identity = new Identity();
		$identity->email = strtolower(Commons::getProperty($payload, 'email'));
		$identity->salt = $secret['salt'];
		$identity->iterations = $secret['iterations'];
		$identity->hpass = $secret['hpass'];
		$identity->user_id = $user->id;
		$identity->reset_token = '';
		$identity->save();

		// Include user email
		$user->email = $identity->email;

		// Save wine knowledge
		if (!empty($payload['wine_knowledge'])) {
			$savedWineKnowledge = $this->saveWineKnowledge($user, $payload['wine_knowledge']);
		}

		return $user;
	}

	public function getUserInfo($refOrHandleOrEmail)
	{
		$user = $this->findUser($refOrHandleOrEmail);

		return [
			'name' => $user->name,
			'handle' => $user->handle,
			'gravatar' => NTBL_Sign::md5($user->email),
			'ref' => $user->ref,
			'salt' => $user->salt,
			'iterations' => $user->iterations,
		];
	}

	public function getRawIdentityByRef($refOrHandle)
	{
		$rawData = $this->findUser($refOrHandle);
		$rawData->makeVisible('id');

		if (empty($rawData)) {
			ValidationHelper::fail(
				'Identity not found',
				$this->errorCodes['invalid_identity'],
				'ref',
				__FILE__,
				__LINE__,
				['ref' => $ref]
			);
		}
		return $rawData;
	}

	public function getSpecsByEmail($userEmail)
	{
		$this->validateEmail($userEmail, '|exists:identity,email');
		return Identity::getSpecsByEmail($userEmail);
	}

	public function deactivateUser($authUser)
	{
		$user = User::with('identity')
			->where('ref', '=', $authUser->ref)
			->first();
		$user->identity->delete();
		$user->delete();

		return $user;
	}

	public function deactivateMultipleUsers($users)
	{
		$this->validateUsers($users);
		foreach ($users as $refOrHandleOrEmail) {
			$user = $this->findUser($refOrHandleOrEmail);
			if (!empty($user)) {
				$this->deactivateUser($user);
			}
		}
	}

	public function updatePassword($payload, $token = null)
	{
		$this->validateChangePassPayload($payload);

		// generate secret
		$secret = $this->generateSecret($payload);
		$user = Auth::user();

		if (!empty($token)) {
			$identity = Identity::with('user')
				->where('reset_token', '=', $token)
				->first();
			$user = $identity->user;
		}

		$user->identity->salt = $secret['salt'];
		$user->identity->hpass = $secret['hpass'];
		$user->identity->iterations = $secret['iterations'];
		$user->identity->save();
		return $user;
	}

	public function sanitizeProfileData($user)
	{
		$user->makeHidden('id');
		$user->makeHidden('hpass');
		$user->makeHidden('salt');
		$user->makeHidden('iterations');
		$user->makeHidden('reset_token');
		$user->makeHidden('user_id');
		$user->makeHidden('identity');
		$user->makeHidden('user_contact_id');
		$user->makeHidden('user_wine_knowledge_id');
		$user->makeHidden('user_demographic_id');
		$user->makeHidden('demographic');
		$user->makeHidden('interestRelations');
		$user->makeHidden('userBadges');
		$user->makeHidden('user_preferences_id');
		$user->makeHidden('deleted_at');
		$user->makeHidden('updated_at');
		$user->makeHidden('wineKnowledge');
		$user->educations->makeHidden('id');
		$user->educations->makeHidden('user_id');

		// makeHidden() has problems with a null single object
		if (!empty($user->contact)) {
			$user->contact->makeHidden('id');
		}

		if (!empty($user->demographic)) {
			if (!empty($user->demographic->address)) {
				$user->demographic->address->makeHidden('id');
				$user->demographic->address->makeHidden('locality');
				$user->demographic->address->makeHidden('country_id');
				$user->demographic->address->makeHidden('locality_id');
				$user->demographic->address->makeHidden('country');
			}

			//languages is array , no need to check for empty
			$user->demographic->languages->makeHidden('id');
			$user->demographic->languages->makeHidden('user_demographic_id');
		}

		return $user;
	}

	public function refresh($user)
	{
		// Reload a fresh model instance from the database for all the entities.
		$user = $user->fresh();

		$user->email = $user->identity->email;
		$user->contact = $user->contact;
		$user->gravatar = NTBL_Sign::md5($user->email);

		$user = $this->prepareWineKnowledge($user);
		$user = $this->prepareUserEducations($user);
		$user = $this->prepareUserPreferences($user);
		$user = $this->prepareDemographicData($user);
		$user = $this->prepareLanguages($user);
		$user = $this->prepareInterests($user);
		$user = $this->prepareBadges($user);
		$user = $this->prepareBillingPortal($user);
		$user = $this->prepareSubscription($user);

		return $user;
	}

	public function saveUserData($user, $payload)
	{
		$this->validateUserDataPayload($payload);

		if (isset($payload['name'])) {
			$user->name = Commons::getProperty($payload, 'name');
		}

		if (isset($payload['handle'])) {
			$user->handle = Commons::getProperty($payload, 'handle');
		}

		if (isset($payload['birth_date'])) {
			$user->birth_date = Commons::getProperty($payload, 'birth_date');
		}

		if (isset($payload['gdpr_consent'])) {
			$user->gdpr_consent = Commons::getProperty($payload, 'gdpr_consent');
		}

		// todo : Restore Updating of Email
		// if (isset($payload['email'])) {
		// 	$user->identity->email = strtolower(Commons::getProperty($payload, 'email'));
		// }

		// Ensure Demographic
		$userDemographic = $this->saveUserDemographicData($user);

		if (isset($payload['preferences'])) {
			$preferences = Commons::getProperty($payload, 'preferences', null);

			if (!empty($preferences)) {
				$this->saveUserPreferencesData($user, $preferences);
			}
		}

		if (isset($payload['educations'])) {
			$education = Commons::getProperty($payload, 'educations', []);
			$savedEducation = $this->saveEducation($user, $education);
		}

		if (isset($payload['contact'])) {
			$userContact = Commons::getProperty($payload, 'contact');

			if (!empty($payload['contact'])) {
				$savedUserContact = $this->saveUserContactData($user, $userContact);
			}
		}

		if (isset($payload['wine_knowledge'])) {
			$wineKnowledge = Commons::getProperty($payload, 'wine_knowledge');

			if (!empty($payload['wine_knowledge'])) {
				$savedWineKnowledge = $this->saveWineKnowledge($user, $wineKnowledge);
			}
		}

		if (isset($payload['address'])) {
			$userAddress = Commons::getProperty($payload, 'address');

			if (!empty($payload['address'])) {
				$savedUserAddress = $this->saveAddress($user, $userAddress);
				$savedLocality = $this->saveLocality($user, $userAddress);
			}
		}

		if (isset($payload['languages'])) {
			$userLanguages = Commons::getProperty($payload, 'languages', []);
			$savedUserLanguages = $this->saveLanguages($user, $userLanguages);
		}

		if (isset($payload['interests'])) {
			$userInterests = Commons::getProperty($payload, 'interests', []);
			$savedUserInterests = $this->saveInterests($user, $userInterests);
		}

		$user = $this->processAvatar($user, $payload);
		$user->push();
		return $this->refresh($user);
	}

	public function getPendingTeamJoinRequests($user)
	{
		$actionType = ActionType::where('key', '=', 'join')->first();
		return $this->getUserTeamActions($user, $actionType, 'pending');
	}

	public function getPendingTeamInvites($user)
	{
		$actionType = ActionType::where('key', '=', 'invite')->first();
		return $this->getUserTeamActions($user, $actionType, 'pending');
	}

	public function acceptTeamInvite($actionRef, $user)
	{
		// Todo: refactor this later, perhaps splitting the code sections below into their own function

		// Get the action type and team action
		$actionType = ActionType::where('key', '=', 'invite')->first();
		$teamAction = TeamAction::getFullData($user, null, $actionType, $actionRef);
		$teamService = new TeamService();

		// Validate the teamAction (aka invite)
		$this->validateInvite($teamAction, $actionRef, $teamService);

		// Approve the invite
		$teamAction->status = 'approved';
		$teamAction->save();

		/*
			Update the relationship between the user and the team.
			In other words make the user an official member|admin or whatever of the team
		*/
		$team = $teamAction->team;
		$role = $teamAction->relationType;
		$teamService->setRelation($team, $user, $role);

		// Prepare the response data for the accept invite
		$teamAction->user_ref = $user->ref;
		$teamAction->team_ref = $team->ref;
		$teamAction->role = $role->key;
		$teamAction->makeHidden('actionType');
		$teamAction->makeHidden('relationType');
		return $teamAction;
	}

	public function getBilling($user)
	{
		return UserBilling::where('user_id', '=', $user->id)->first();
	}

	public function saveBilling($user, $portalLink, $expiresAt)
	{
		$billing = UserBilling::where('user_id', '=', $user->id)->first();

		if (empty($billing)) {
			$billing = new UserBilling();
		}

		$billing->user_id = $user->id;
		$billing->portal_link = $portalLink;
		$billing->expires_at = Carbon::parse($expiresAt)->format('Y-m-d H:i:s');
		$billing->save();

		return $billing;
	}

	private function validateInvite($invite, $inviteRef, TeamService $teamService)
	{
		if (empty($invite)) {
			ValidationHelper::fail(
				"No invite with this ref:{$inviteRef} was found.",
				$this->errorCodes['invalid_invite_ref'],
				'invite_ref',
				__FILE__,
				__LINE__,
				[
					'invite_ref' => $inviteRef,
				]
			);
		}

		// Check if the user is already a member
		$userRelations = $teamService->getRelationsV2($invite->team, $invite->user);
		$allowedRoles = ['admin', 'editor', 'member'];
		$teamService->validateAlreadyTeamMember(
			$userRelations,
			$allowedRoles,
			$invite->user,
			$invite->team
		);
	}

	private function validateUsers($users)
	{
		if (empty($users) || !is_array($users)) {
			ValidationHelper::fail(
				'Invalid users property',
				$this->errorCodes['invalid_property'],
				'users',
				__FILE__,
				__LINE__
			);
		}
	}

	private function getUserTeamActions($user, $actionType, $status)
	{
		$userTeamActions = TeamAction::with(['team', 'user', 'actionType'])
			->where([
				['user_id', '=', $user->id],
				['action_type_id', '=', $actionType->id],
				['status', '=', $status],
				['deleted_at', '=', null],
			])
			->get();

		foreach ($userTeamActions as $userTeamAction) {
			$userTeamAction->user_ref = $userTeamAction->user->ref;
			$userTeamAction->team_ref = $userTeamAction->team->ref;
			$userTeamAction->status = $userTeamAction->status;
			$userTeamAction->role = $userTeamAction->relationType->key;
			$userTeamAction->makeHidden('actionType');
			$userTeamAction->makeHidden('relationType');
		}

		return $userTeamActions;
	}

	private function processAvatar($entity, $payload)
	{
		// Ensures that the entity will have a avatar property
		$entity->avatar = $entity->avatar;

		if (empty($payload[$this->avatarPayloadKey])) {
			return $entity;
		}

		ValidationHelper::validateImage($this->avatarPayloadKey);
		if (!empty($entity->avatar)) {
			$this->deleteAvatar($entity->avatar);
		}

		$avatar = $this->saveAvatar($payload[$this->avatarPayloadKey]);
		if ($avatar) {
			$entity->avatar = $avatar->ref;
		}

		return $entity;
	}

	private function saveAvatar($file)
	{
		$fileInfo = FileHelper::storeFile($file);
		$savedFile = FileHelper::saveFile($fileInfo, $this->fileRefLength);
		return $savedFile;
	}

	private function deleteAvatar($avatarRef)
	{
		if (!empty($avatarRef)) {
			$prevAvatar = File::where('ref', '=', $avatarRef)->first();
			if (!empty($prevAvatar)) {
				FileHelper::deleteFile($prevAvatar);
				$prevAvatar->delete();
			}
		}
	}

	private function saveUserDemographicData($user)
	{
		$userDemographicObject = $this->buildUserDemographicObject($user);
		$savedDemographicObject = $user->demographic()->save($userDemographicObject);
		$user->push();
		return $userDemographicObject;
	}

	private function buildUserDemographicObject($user)
	{
		if (empty($user->demographic)) {
			return new UserDemographic();
		}

		return $user->demographic;
	}

	private function saveEducation($user, $education)
	{
		$userEducationObjects = $this->buildUserEducationObjects($user, $education);

		// Clear Educations
		$this->deleteUserEducationsById($user->educations->pluck('id')->toArray());

		// Bulk save user education
		$savedEducationObjects = $user->educations()->saveMany($userEducationObjects);
		$savedEducation = [];

		foreach ($savedEducationObjects as $education) {
			$savedEducation[] = $education->toArray();
		}

		return $savedEducation;
	}

	private function buildUserEducationObjects($user, $education)
	{
		$userEducationObjects = [];

		if (empty($education)) {
			return $userEducationObjects;
		}

		foreach ($education as $educationInfo) {
			$education = new UserEducation();
			$education->ref = StringHelper::readableRefGenerator(
				$this->refLength,
				'user_education',
				'ref'
			);
			$education->school = $educationInfo['school'];

			if (isset($educationInfo['description'])) {
				$education->description = $educationInfo['description'];
			}

			if (isset($educationInfo['achievement'])) {
				$education->achievement = $educationInfo['achievement'];
			}

			if (isset($educationInfo['completed'])) {
				$education->completed = $educationInfo['completed'];
			}

			if (isset($educationInfo['year'])) {
				$education->year = $educationInfo['year'];
			}

			if (isset($educationInfo['country_code'])) {
				$country = Country::where(
					'alpha2',
					'=',
					strtoupper($educationInfo['country_code'])
				)->first();
				if (!empty($country)) {
					$education->country_id = $country->id;
				}
			}

			$userEducationObjects[] = $education;
		}

		return $userEducationObjects;
	}

	private function deleteUserEducationsById($educationIds)
	{
		if (empty($educationIds) && !is_array($educationIds)) {
			return false;
		}

		UserEducation::whereIn('id', $educationIds)->delete();
	}

	private function saveUserContactData($user, $userContact)
	{
		$userContactObject = $this->buildUserContactObject($user, $userContact);
		$userContactObject = $user->contact()->save($userContactObject);
		return $userContactObject;
	}

	private function buildUserContactObject($user, $contact)
	{
		if (empty($contact)) {
			return $contact;
		}

		if (empty($user->contact)) {
			return new UserContact([
				'phone_prefix' => preg_replace(
					'/^0+/',
					'+',
					Commons::getProperty($contact, 'phone_prefix')
				),
				'phone' => Commons::getProperty($contact, 'phone'),
				'linkedin' => Commons::getProperty($contact, 'linkedin'),
				'twitter' => Commons::getProperty($contact, 'twitter'),
			]);
		}

		if (isset($contact['phone_prefix'])) {
			$user->contact->phone_prefix = preg_replace(
				'/^0+/',
				'+',
				Commons::getProperty($contact, 'phone_prefix')
			);
		}

		if (isset($contact['phone'])) {
			$user->contact->phone = Commons::getProperty($contact, 'phone');
		}

		if (isset($contact['linkedin'])) {
			$user->contact->linkedin = Commons::getProperty($contact, 'linkedin');
		}

		if (isset($contact['twitter'])) {
			$user->contact->twitter = Commons::getProperty($contact, 'twitter');
		}

		return $user->contact;
	}

	public function saveUserPreferencesData($user, $preferences)
	{
		$userPreferencesObject = $this->buildUserPreferencesObject($user, $preferences);
		$savedPreferencesObject = $user->preferences()->save($userPreferencesObject);
		return $savedPreferencesObject;
	}

	private function buildUserPreferencesObject($user, $preferences)
	{
		if (empty($preferences)) {
			return $preferences;
		}

		if (empty($user->preferences)) {
			$userPreferences = new UserPreferences();

			if (isset($preferences['lang'])) {
				$langKey = Commons::getProperty($preferences, 'lang');
				$preferredLanguage = $this->getPreferredLanguageByKey($user, $langKey);
				$userPreferences->lang = $preferredLanguage->id;
			}

			if (isset($preferences['currency'])) {
				$currencyKey = Commons::getProperty($preferences, 'currency');
				$preferredCurrency = $this->getPreferredCurrencyByKey($user, $currencyKey);
				$userPreferences->currency = $preferredCurrency->id;
			}

			$userPreferences->save();
			return $userPreferences;
		}

		if (isset($preferences['lang'])) {
			$langKey = Commons::getProperty($preferences, 'lang');
			$preferredLanguage = $this->getPreferredLanguageByKey($user, $langKey);
			$user->preferences->lang = $preferredLanguage->id;
		}

		if (isset($preferences['currency'])) {
			$currencyKey = Commons::getProperty($preferences, 'currency');
			$preferredCurrency = $this->getPreferredCurrencyByKey($user, $currencyKey);
			$user->preferences->currency = $preferredCurrency->id;
		}

		return $user->preferences;
	}

	private function saveWineKnowledge($user, $wineKnowledge)
	{
		$userWineKnowledgeObject = $this->buildUserWineKnowledgeObject($user, $wineKnowledge);
		$savedWineKnowledgeObject = $user->wineKnowledge()->save($userWineKnowledgeObject);
		return $savedWineKnowledgeObject;
	}

	private function buildUserWineKnowledgeObject($user, $wineKnowledge)
	{
		if (empty($wineKnowledge)) {
			return $wineKnowledge;
		}

		if (empty($user->wineKnowledge)) {
			return new UserWineKnowledge([
				'title_key' => $wineKnowledge,
			]);
		}

		$user->wineKnowledge->title_key = $wineKnowledge;
		return $user->wineKnowledge;
	}

	private function saveAddress($user, $payload)
	{
		// Refresh the relationship , else demographic->address() will be null
		$user = $user->fresh();

		$userAddressObject = $this->buildUserAddressObject($user, $payload);
		$savedAddressObject = $user->demographic->address()->save($userAddressObject);
		$user->demographic->address_id = $userAddressObject->id;
		$user->push();

		return $savedAddressObject;
	}

	private function buildUserAddressObject($user, $address)
	{
		if (empty($address)) {
			return $address;
		}

		$this->country = Country::where(
			'alpha2',
			'=',
			strtoupper($address['country_code'])
		)->first();

		if (empty($user->demographic->address)) {
			return new Address([
				'info1' => $address['info1'],
				'info2' => $address['info2'],
				'region' => $address['region'],
				'country_id' => $this->country->id,
			]);
		}

		$userAddress = $user->demographic->address;
		$userAddress->info1 = $address['info1'];
		$userAddress->info2 = $address['info2'];
		$userAddress->region = $address['region'];
		$userAddress->country_id = $this->country->id;

		return $userAddress;
	}

	private function saveLocality($user, $payload)
	{
		// Refresh the relationship , to save locality_id within demographic->address
		$user = $user->fresh();

		$userLocalityObject = $this->buildUserLocalityObject($user, $payload);
		$savedLocalityObject = $user->demographic->address->locality()->save($userLocalityObject);
		$user->demographic->address->locality_id = $userLocalityObject->id;
		$user->push();

		return $savedLocalityObject;
	}

	private function buildUserLocalityObject($user, $locality)
	{
		if (empty($locality)) {
			return $locality;
		}

		if (empty($user->demographic->address->locality)) {
			return new Locality([
				'name' => $locality['city'],
				'postal_code' => $locality['postal_code'],
				'country_id' => $this->country->id,
			]);
		}

		$userLocality = $user->demographic->address->locality;
		$userLocality->name = $locality['city'];
		$userLocality->postal_code = $locality['postal_code'];
		$userLocality->country_id = $this->country->id;

		return $userLocality;
	}

	private function saveLanguages($user, $payload)
	{
		$user = $user->fresh();

		$userLanguageObjects = $this->buildUserLanguageObjects($user, $payload);

		// Clear Languages
		$this->deleteUserlanguages($user->demographic->languages->pluck('id')->toArray());

		// Bulk save user languages
		$savedLanguageObjects = $user->demographic->languages()->saveMany($userLanguageObjects);
		$savedLanguage = [];

		foreach ($savedLanguageObjects as $language) {
			$savedLanguage[] = $language->toArray();
		}

		return $savedLanguage;
	}

	private function buildUserLanguageObjects($user, $languages)
	{
		$userLanguageObjects = [];

		if (empty($languages)) {
			return $userLanguageObjects;
		}

		foreach ($languages as $language) {
			$userLanguageObjects[] = new UserLanguage([
				'name' => $language,
			]);
		}

		return $userLanguageObjects;
	}

	private function deleteUserLanguages($languageIds)
	{
		if (empty($languageIds) && !is_array($languageIds)) {
			return false;
		}

		UserLanguage::whereIn('id', $languageIds)->delete();
	}

	private function saveInterests($user, $payload)
	{
		$user = $user->fresh();
		$userInterestObjects = $this->buildUserInterestObjects($user, $payload);

		// Clear Interests
		$this->deleteUserInterestRelationsById($user->interestRelations->pluck('id')->toArray());

		// Bulk save user interest relations
		$savedUserInterestObjects = $user->interestRelations()->saveMany($userInterestObjects);

		return $savedUserInterestObjects;
	}

	private function buildUserInterestObjects($user, $interests)
	{
		$userInterestObjects = [];

		if (empty($interests)) {
			return $userInterestObjects;
		}

		$user = Auth::user();

		foreach ($interests as $interest) {
			// Value
			$interestObject = new UserInterest([
				'value' => $interest['value'],
			]);

			$interestObject->save();

			// Type
			$interestTypeObject = UserInterestType::where('key', '=', $interest['key'])->first();

			// Relation
			$userInterestObjects[] = new UserInterestRelation([
				'ref' => StringHelper::readableRefGenerator(
					$this->refLength,
					'user_interest_relation',
					'ref'
				),
				'user_id' => $user->id,
				'user_interest_id' => $interestObject->id,
				'user_interest_type_id' => $interestTypeObject->id,
			]);
		}

		return $userInterestObjects;
	}

	private function deleteUserInterestRelationsById($userInterestRelationIds)
	{
		if (empty($userInterestRelationIds) && !is_array($userInterestRelationIds)) {
			return false;
		}

		$userInterestIds = UserInterestRelation::whereIn('id', $userInterestRelationIds)->pluck(
			'user_interest_id'
		);

		UserInterestRelation::whereIn('id', $userInterestRelationIds)->delete();
		$this->deleteUserInterests($userInterestIds);
	}

	private function deleteUserInterests($userInterestIds)
	{
		if (empty($userInterestIds) && !is_array($userInterestIds)) {
			return false;
		}

		UserInterest::whereIn('id', $userInterestIds)->delete();
	}

	public function findUser($refOrHandleOrEmail)
	{
		$atPosition = strpos($refOrHandleOrEmail, '@');

		if (0 === $atPosition) {
			return $this->findUserbyHandle(substr($refOrHandleOrEmail, 1));
		}

		if (0 < $atPosition) {
			return $this->findUserByEmail($refOrHandleOrEmail);
		}

		return $this->findUserByRef($refOrHandleOrEmail);
	}

	public function getUserTitles()
	{
		$userTitles = UserTitle::orderBy('id')
			->get()
			->makeHidden('id');
		return ['user_titles' => $userTitles];
	}

	public function sendUserResetToken($userEmail, $clientHost)
	{
		$this->validateEmail($userEmail, '|exists:identity,email,deleted_at,NULL');
		$this->validateClientHost($clientHost);

		$toEmail = $userEmail;
		$resetToken = $this->createUserResetToken($userEmail);

		$this->mailService->send($this->resetTemplate, [$toEmail, $resetToken, $clientHost]);
		$specs = Identity::getSpecsByEmail($userEmail);
		$this->responseData['userRef'] = $specs->ref;
		$this->responseData['salt'] = $specs->salt;
		$this->responseData['iterations'] = $specs->iterations;

		if (DEV && IS_WHITELISTED) {
			$this->responseData['resetToken'] = $resetToken;
		}

		return $this->responseData;
	}

	public function sendUserSignup($user, $clientHost)
	{
		$this->validateClientHost($clientHost);
		$this->mailService->send($this->signupTemplate, [$user->email, $user->name, $clientHost]);
	}

	public function useResetToken($token, $payload)
	{
		// Validate the token and userEmail
		$this->validateResetToken($token, '|exists:identity,reset_token,deleted_at,NULL');

		// Validate and Update Password
		$this->validateChangePassPayload($payload);
		$user = $this->updatePassword($payload, $token);

		// Consume the reset password
		$this->deleteUserResetToken($token);
		return $user;
	}

	public function validateChangePassPayload($payload)
	{
		ValidationHelper::validatePayload($payload);

		$rules = [
			'hpass' => Identity::$rules['hpass'],
			'iterations' => Identity::$rules['iterations'],
		];

		ValidationHelper::validateWithRules($payload, $rules);
	}

	public function deleteUserEducations($payload)
	{
		$user = Auth::user();
		$educationRefs = Commons::getProperty($payload, 'education_refs', []);

		//validate refs
		$this->validateUserEducations($educationRefs, $user);
		return UserEducation::deleteByRefs($educationRefs, $user);
	}

	public function deleteUserInterestRelations($payload)
	{
		$user = Auth::user();
		$interestRefs = Commons::getProperty($payload, 'interest_refs', []);

		//validate refs
		$this->validateUserinterests($interestRefs, $user);
		return UserInterestRelation::deleteByRefs($interestRefs, $user);
	}

	private function deleteUserResetToken($userToken)
	{
		$identity = Identity::where('reset_token', '=', $userToken)->first();
		$identity->reset_token = '';
		$identity->save();
	}

	private function createUserResetToken($userEmail)
	{
		$rawToken = NTBL_Sign::sha256d(random_bytes(64));
		$resetToken = substr($rawToken, 0, $this->resetTokenMaxLength);
		$this->validateResetToken($resetToken);

		$identity = Identity::where('email', '=', $userEmail)
			->whereNull('deleted_at')
			->first();
		$identity->reset_token = $resetToken;
		$identity->save();
		return $identity->reset_token;
	}

	public function validateResetToken($token, $extraRules = '')
	{
		if (empty($token)) {
			ValidationHelper::fail(
				'Reset token missing',
				$this->errorCodes['invalid_token'],
				'token',
				__FILE__,
				__LINE__
			);
		}

		$rules = "string|max:{$this->resetTokenMaxLength}" . $extraRules;
		ValidationHelper::validateWithRules(['token' => $token], ['token' => $rules]);
	}

	private function validateEmail($email, $extraRules = '')
	{
		if (empty($email)) {
			ValidationHelper::fail(
				'Email missing',
				$this->errorCodes['email'],
				'email',
				__FILE__,
				__LINE__
			);
		}

		$errorMessage = 'No user with this email was found.';
		$errorKey = $this->errorCodes['user_does_not_exist'];
		$errorField = 'email';
		$rules = "email|max:{$this->emailMaxLength}" . $extraRules;
		ValidationHelper::validateWithRules(
			['email' => $email],
			['email' => $rules],
			$errorMessage,
			$errorKey,
			$errorField
		);
	}

	private function validateClientHost($clientHost)
	{
		$data = ['client_host' => $clientHost];
		$rules = ['client_host' => 'required|string|url|max:64|valid_client_host'];
		ValidationHelper::validateWithRules($data, $rules);
	}

	public function validateResetPasswordPayload($userEmail, $resetToken, $payload)
	{
		// User email and reset token can't be sent at the same time but can't be empty at the same time either
		if (
			(!empty($userEmail) && !empty($resetToken)) ||
			(empty($userEmail) && empty($resetToken))
		) {
			ValidationHelper::fail(
				'Payload empty or invalid',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'payload' => $payload,
				]
			);
		}
	}

	private function validateUserEducations($educationRefs, $user)
	{
		if (empty($educationRefs) || !is_array($educationRefs)) {
			ValidationHelper::fail(
				'Invalid education refs',
				$this->errorCodes['invalid_payload'],
				'',
				__FILE__,
				__LINE__,
				[
					'educationRefs' => $educationRefs,
				]
			);
		}

		$educationsDB = UserEducation::whereIn('ref', $educationRefs)->where(
			'user_id',
			'=',
			$user->id
		);

		$educationRefsDB = $educationsDB
			->get()
			->pluck('ref')
			->toArray();

		ValidationHelper::checkForNonExistingKeysOrRefs(
			$educationRefs,
			$educationRefsDB,
			'education'
		);
	}

	private function validateUserInterests($interestRefs, $user)
	{
		if (empty($interestRefs) || !is_array($interestRefs)) {
			ValidationHelper::fail(
				'Invalid interest refs',
				$this->errorCodes['invalid_payload'],
				'interest_refs',
				__FILE__,
				__LINE__,
				[
					'interest_refs' => $interestRefs,
				]
			);
		}

		$interestsDB = UserInterestRelation::whereIn('ref', $interestRefs)->where(
			'user_id',
			'=',
			$user->id
		);

		$interestRefsDB = $interestsDB
			->get()
			->pluck('ref')
			->toArray();

		ValidationHelper::checkForNonExistingKeysOrRefs($interestRefs, $interestRefsDB, 'interest');
	}

	private function validateUserDataPayload($payload, $user = null)
	{
		ValidationHelper::validatePayload($payload);

		if (empty($user)) {
			$user = Auth::user();
		}

		$rules = User::$rules;
		$rules['handle'] = 'string|nullable|max:255|valid_handle';
		$rules['email'] = 'string|max:255|email';

		$email = Commons::getProperty($payload, 'email');
		$handle = Commons::getProperty($payload, 'handle');
		$educations = Commons::getProperty($payload, 'educations', []);
		$contact = Commons::getProperty($payload, 'contact', []);
		$wineKnowledge = Commons::getProperty($payload, 'wine_knowledge');
		$address = Commons::getProperty($payload, 'address', []);
		$languages = Commons::getProperty($payload, 'languages', []);
		$interests = Commons::getProperty($payload, 'interests', []);
		$preferences = Commons::getProperty($payload, 'preferences', null);

		/*
			Note: Since the user might resend his/her old data, 
			only check the uniqueness handle and email 
			if they're not exactly the same as the old ones
		*/

		if ($user->handle !== trim($handle)) {
			$rules['handle'] .= '|unique:user,handle';
		}

		if ($user->identity->email !== trim($email)) {
			$rules['email'] .= '|filled|unique:identity,email';
		}

		ValidationHelper::validateWithRules($payload, $rules);

		// Validate the props for each and every education
		if (!empty($educations)) {
			foreach ($educations as $education) {
				ValidationHelper::validateWithRules($education, UserEducation::$rules);
			}
		}

		if (!empty($contact)) {
			ValidationHelper::validateWithRules($contact, UserContact::$rules);
		}

		if (!empty($wineKnowledge)) {
			ValidationHelper::validateWithRules(
				['wine_knowledge' => $wineKnowledge],
				['wine_knowledge' => UserWineKnowledge::$rules['user_title']]
			);
		}

		if (!empty($address)) {
			$rules = [
				'info1' => Address::$rules['info1'],
				'info2' => Address::$rules['info2'],
				'region' => Address::$rules['region'],
				'country_code' => Address::$rules['country_code'],
				'city' => Locality::$rules['name'],
				'postal_code' => Locality::$rules['postal_code'],
			];

			ValidationHelper::validateWithRules($address, $rules);
		}

		if (!empty($languages)) {
			foreach ($languages as $language) {
				ValidationHelper::validateWithRules(
					[
						'name' => $language,
					],
					UserLanguage::$rules
				);
			}
		}

		if (!empty($interests)) {
			foreach ($interests as $interest) {
				ValidationHelper::validateWithRules(
					[
						'value' => $interest['value'],
						'key' => $interest['key'],
					],
					[
						'value' => UserInterest::$rules['value'],
						'key' => UserInterest::$rules['key'],
					]
				);
			}
		}

		$this->validateUserPreferences($preferences);
	}

	public function validateUserPreferences($preferences)
	{
		if (empty($preferences)) {
			return;
		}

		$lang = isset($preferences['lang']) ? $preferences['lang'] : null;
		$currency = isset($preferences['currency']) ? $preferences['currency'] : null;

		ValidationHelper::validateWithRules(
			[
				'lang' => $lang,
				'currency' => $currency,
			],
			UserPreferences::$rules
		);
	}

	public function validateIdentityPayload($payload)
	{
		ValidationHelper::validatePayload($payload);

		$rules = Identity::$rules;
		$rules['name'] = User::$rules['name'];
		$rules['handle'] = User::$rules['handle'];

		ValidationHelper::validateWithRules($payload, $rules);

		if (!empty($payload['wine_knowledge'])) {
			ValidationHelper::validateWithRules(
				['wine_knowledge' => array_get($payload, 'wine_knowledge')],
				['wine_knowledge' => UserWineKnowledge::$rules['user_title']]
			);
		}
	}

	public function validateCountry($country)
	{
		if (empty($country)) {
			ValidationHelper::fail(
				'Country code must not be empty if provided. Please use null to clear the field.',
				$this->errorCodes['country_code'],
				'',
				__FILE__,
				__LINE__,
				['country' => $country]
			);
		}
	}

	private function findUserbyHandle($handle)
	{
		ValidationHelper::validateEntityExists($handle, 'user', 'handle');
		$user = User::getUserByHandle($handle);
		return $user;
	}

	private function findUserByEmail($email)
	{
		ValidationHelper::validateEntityExists($email, 'identity', 'email');
		$user = Identity::getByEmail($email);
		return $user;
	}

	private function findUserByRef($ref)
	{
		ValidationHelper::validateEntityExists($ref, 'user', 'ref');
		$user = User::getUserByRef($ref);
		return $user;
	}

	private function getPreferredLanguageByKey($user, $langKey)
	{
		if (empty($langKey)) {
			$langKey = 'en';
		}

		$preferredLanguage = Lang::where('key', '=', $langKey)->first();
		return $preferredLanguage;
	}

	private function getPreferredCurrencyByKey($user, $currencyKey)
	{
		if (empty($currencyKey)) {
			$currencyKey = 'usd';
		}

		$preferredCurrency = Currency::where('key', '=', $currencyKey)->first();
		return $preferredCurrency;
	}

	public function generateSecret($payload)
	{
		// generate secret
		$salt = $this->generateSalt();
		$pass = Commons::getProperty($payload, 'hpass');
		$iterations = Commons::getProperty($payload, 'iterations');
		$hpass = NTBL_Sign::pbkdf2_sha256($this->implementation . $pass, $salt, $iterations);

		return ['salt' => $salt, 'iterations' => $iterations, 'hpass' => $hpass];
	}

	public function getPlan($user)
	{
		/*
			This function will try to fetch the user's subscription/plan based on importance or weight.
			1. Paid subscriptions basic, pro, scholar (Highest)
			2. View subscription
			3. Initial subscription
		*/

		$subscription = $user->getPaidActiveSubscription();

		if (empty($subscription)) {
			$subscription = $user->getViewSubscription();
		}

		if (empty($subscription)) {
			$subscription = $user->getInitialSubscription();
		}

		$subscription->active_plan = $subscription->subscriptionPlan->key;
		// todo: add sponsor when voucher/coupon functionality is done
		return $subscription;
	}

	private function generateSalt()
	{
		// create random salt
		$salt = NTBL_Sign::sha256d(random_bytes(64));
		ValidationHelper::validateWithRules(
			['salt' => $salt],
			['salt' => 'sha256'],
			$this->errorMessage,
			$this->errorKey,
			$this->errorField
		);
		// Validate $salt
		return $salt;
	}

	private function prepareWineKnowledge($user)
	{
		$user->wine_knowledge = null;
		$user->wine_knowledge = $user->wineKnowledge;

		if (!empty($user->wine_knowledge)) {
			$user->wine_knowledge = $user->wine_knowledge->title_key;
		}

		return $user;
	}

	private function prepareUserEducations($user)
	{
		$user->educations = $user->educations;
		if (!empty($user->educations)) {
			foreach ($user->educations as $education) {
				$education->country_code = null;
				$education->country = $education->country;
				if (!empty($education->country)) {
					$education->country_code = $education->country->alpha2;
				}
			}
		}

		return $user;
	}

	private function prepareUserPreferences($user)
	{
		$rawPreferences = $user->preferences()->first();

		if (empty($rawPreferences)) {
			$user->preferences = new \stdClass();
			return $user;
		}

		$finalPreferences = new \stdClass();
		$finalPreferences->lang = $this->prepareUserLang($rawPreferences);
		$finalPreferences->currency = $this->prepareUserCurrency($rawPreferences);
		$user->preferences = $finalPreferences;
		return $user;
	}

	private function prepareDemographicData($user)
	{
		$user->address = null;
		$user->demographic = $user->demographic;

		if (!empty($user->demographic)) {
			$user->address = $user->demographic->address;

			if (!empty($user->demographic->address)) {
				$user->demographic->address->country_code =
					$user->demographic->address->country->alpha2;
				$user->demographic->address->locality = $user->demographic->address->locality;

				if (!empty($user->demographic->address->locality)) {
					$user->demographic->address->city = $user->demographic->address->locality->name;
					$user->address->postal_code =
						$user->demographic->address->locality->postal_code;
				}
			}
		}

		return $user;
	}

	private function prepareLanguages($user)
	{
		$user->languages = null;

		if (!empty($user->demographic)) {
			$user->languages = $user->demographic->languages->pluck('name');
		}

		return $user;
	}

	private function prepareInterests($user)
	{
		$interests = [];
		$user->interests = $interests;

		if (!empty($user->interestRelations)) {
			foreach ($user->interestRelations as $interest) {
				$interest->userInterest = $interest->userInterest()->first();
				$interest->userInterestType = $interest->userInterestType()->first();
				$interests[] = [
					'ref' => $interest->ref,
					'value' => $interest->userInterest->value,
					'key' => $interest->userInterestType->key,
				];
			}
			$user->interests = $interests;
		}

		return $user;
	}

	private function prepareBadges($user)
	{
		$badges = [];
		if (!empty($user->userBadges)) {
			foreach ($user->userBadges as $userBadge) {
				$badges[] = $userBadge->badge->key;
			}
		}
		$user->badges = $badges;

		return $user;
	}

	private function prepareUserLang($preferences)
	{
		if (empty($preferences->preferredLang)) {
			return '';
		}

		return $preferences->preferredLang->key;
	}

	private function prepareUserCurrency($preferences)
	{
		if (empty($preferences->preferredCurrency)) {
			return '';
		}

		return $preferences->preferredCurrency->key;
	}

	private function prepareSubscription($user)
	{
		$user->subscription = $this->getPlan($user);
		return $user;
	}

	private function prepareBillingPortal($user)
	{
		$billing = $this->getBilling($user);
		$user->billing_portal_link = null;
		$user->billing_portal_validity = null;

		if (!empty($billing)) {
			$user->billing_portal_link = $billing->portal_link;
			$user->billing_portal_validity = $billing->expires_at;
		}

		return $user;
	}
}
