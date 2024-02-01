const expect = require('chai').expect;
const request = require('request-promise');
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];

const {
	basePostOptions,
	baseUrl,
	checkStatusCodeByOptions,
	generateUserData,
	createItem,
	login,
	checkForSuccess,
	makeUniqueString,
	makeRandomInt,
	signPath,
	randomBool,
	randomPhone,
	randomSocialUrl,
	randomDOB,
	checkUserProfile,
} = require('../common.js');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');

const generateUserProfileData = () => {
	let response;
	let payload = {
		name: makeUniqueString(),
		handle: makeUniqueString(),
		birth_date: '1990-01-14 00:00:00',
		gdpr_consent: '2019-01-14 00:00:00',
		email: 'email_' + makeUniqueString() + '@ntbl-api.com',
		avatar: null,
		preferences: {
			lang: 'en',
			currency: 'USD',
		},
		educations: [
			{
				school: makeUniqueString(),
				description: makeUniqueString(300),
				achievement: makeUniqueString(),
				completed: true,
				year: 2025,
				country_code: 'DK',
			},
			{
				school: makeUniqueString(),
				description: makeUniqueString(300),
				achievement: makeUniqueString(),
			},
		],
		contact: {
			phone_prefix: '+' + randomPhone(1000, 9999),
			phone: randomPhone().toString(),
			linkedin: 'http://linkedin.com/' + makeUniqueString(),
			twitter: 'http://twitter.com/' + makeUniqueString(),
		},
		wine_knowledge: 'wine_collector',
		address: {
			info1: 'Østerfælled',
			info2: 'Torv 2',
			region: 'Hovedstaden',
			city: 'Copenhagen',
			postal_code: '2100',
			country_code: 'US',
		},
		languages: ['English', 'Danish'],
		interests: [
			{
				value: 'Denmark',
				key: 'country',
			},
			{
				value: 'true',
				key: 'newsletter',
			},
		],
	};
	return payload;
};

const checkRetainedUserProfile = (originalData, updatedData, excludedField) => {
	Object.keys(originalData).forEach((key) => {
		if (key.includes('updated_at') || key.includes('gravatar')) {
			return;
		}

		if (
			key == 'preferences' &&
			(excludedField === 'preferred_lang' || excludedField === 'preferred_currency')
		) {
			expect(originalData[key]).to.not.equal(updatedData[key]);
			return;
		}

		if (key === excludedField) {
			expect(originalData[key]).to.not.equal(updatedData[key]);

			if (key === 'email') {
				expect(originalData['gravatar']).to.not.deep.equal(updatedData['gravatar']);
			}

			return;
		}

		expect(originalData[key]).to.deep.equal(updatedData[key]);
	});
};

describe('Update User Profile', () => {
	const updateProfilePath = '/user/profile';
	const updateProfileMethod = 'POST';
	let options, mainUser, testUser, testUserProfile, userTitles, avatar;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		// Create and get profile data for testUser negative tests comparisons
		testUser = generateUserData();
		testUser['handle'] = makeUniqueString();
		await createItem(createUserPath, testUser);
		await login(testUser.email, testUser.rawPass);
		testUserProfile = await request({uri: signPath(updateProfilePath, 'GET'), json: true});

		// Create and login the mainUser for testing updates
		mainUser = generateUserData();
		await createItem(createUserPath, mainUser);
		await login(mainUser.email, mainUser.rawPass);

		userTitles = await request({uri: signPath('/user/titles', 'GET'), json: true});
		userTitles = userTitles.user_titles;
	});

	beforeEach(async () => {
		options.transform = null;
		options.method = 'POST';
		options.uri = signPath(updateProfilePath, updateProfileMethod);
	});

	// Positive Tests
	it('should return correct status code', async () => {
		options.transform = (body, response, resolveWithFullResponse) => {
			return response;
		};
		options.body = generateUserProfileData();
		let response = await request(options);
		expect(response.statusCode).to.equal(200);
	});

	it('should be successful', async () => {
		options.body = generateUserProfileData();
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should have proper data', async () => {
		let userProfileFromUpdate = generateUserProfileData();
		options.body = userProfileFromUpdate;
		let response = await request(options);
		let getUserProfilePath = '/user/profile';

		let getProfileOptions = {
			transform: null,
			json: true,
			method: 'GET',
			uri: signPath(getUserProfilePath, 'GET'),
		};

		// The data returned from updating the user profile must match with the one from the getUserProfile from API
		let userProfileFromAPI = await request(getProfileOptions);
		checkUserProfile(response.data.user, userProfileFromAPI);
	});

	it('should be successful even with [trimmable] characters in fields', async () => {
		options.body = '\ntest name\n';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [name] is null', async () => {
		options.body = generateUserProfileData();
		options.body['name'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [name] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['name'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [handle] is null', async () => {
		options.body = generateUserProfileData();
		options.body['handle'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [handle] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['handle'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [birth_date] is null', async () => {
		options.body = generateUserProfileData();
		options.body['birth_date'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [birth_date] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['birth_date'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [gdpr_consent] is null', async () => {
		options.body = generateUserProfileData();
		options.body['gdpr_consent'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [gdpr_consent] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['gdpr_consent'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [educations] is null', async () => {
		options.body = generateUserProfileData();
		options.body['educations'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [educations] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['educations'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [educations.description] is null', async () => {
		options.body = generateUserProfileData();
		options.body['educations'] = [
			{
				school: makeUniqueString(),
				description: null,
			},
		];

		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [educations.description] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['educations'] = [
			{
				school: makeUniqueString(),
				description: '',
			},
		];

		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [educations.achievement] is null', async () => {
		options.body = generateUserProfileData();
		options.body['educations'] = [
			{
				school: makeUniqueString(),
				achievement: null,
			},
		];

		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [educations.achievement] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['educations'] = [
			{
				school: makeUniqueString(),
				achievement: '',
			},
		];

		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [educations.completed] is null', async () => {
		options.body = generateUserProfileData();
		options.body['educations'] = [
			{
				school: makeUniqueString(),
				completed: null,
			},
		];

		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [educations.year] is null', async () => {
		options.body = generateUserProfileData();
		options.body['educations'] = [
			{
				school: makeUniqueString(),
				year: null,
			},
		];

		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [educations.country_code] is null', async () => {
		options.body = generateUserProfileData();
		options.body['educations'] = [
			{
				school: makeUniqueString(),
				country_code: null,
			},
		];

		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [contact] is null', async () => {
		options.body = generateUserProfileData();
		options.body['contact'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [phone_prefix] starts with plus sign', async () => {
		options.body = generateUserProfileData();
		options.body['contact'] = {
			phone_prefix: '+45',
		};
		let response = await request(options);
		expect(response.data.user.contact.phone_prefix).to.equal('+45');
	});

	it('should convert [contact][phone_prefix] zeroes to plus sign', async () => {
		options.body = generateUserProfileData();
		options.body['contact'] = {
			phone_prefix: '045',
		};
		let response = await request(options);
		expect(response.data.user.contact.phone_prefix).to.equal('+45');
	});

	it('should be successful if [contact] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['contact'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [wine_knowledge] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['wine_knowledge'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [wine_knowledge] is null', async () => {
		options.body = generateUserProfileData();
		options.body['wine_knowledge'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [address] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['address'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [address] is null', async () => {
		options.body = generateUserProfileData();
		options.body['address'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [languages] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['languages'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [languages] is null', async () => {
		options.body = generateUserProfileData();
		options.body['languages'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [interests] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['interests'] = '';
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be successful if [interests] is null', async () => {
		options.body = generateUserProfileData();
		options.body['interests'] = null;
		let response = await request(options);
		checkForSuccess(response);
	});

	it('should be able to upload/update a profile pic', async () => {
		var filePath = np.join(__dirname, './assets/valid/pic.jpg');
		var fileName = np.basename(filePath);
		var type = mime.contentType(fileName);
		var file = fs.createReadStream(filePath);
		var uploadOptions = {
			method: 'POST',
			uri: options.uri,
			formData: {
				name: makeUniqueString(),
				avatar: {
					value: file,
					options: {
						filename: fileName,
						contentType: type,
					},
				},
			},
			headers: {
				'content-type': 'multipart/form-data',
			},
		};

		uploadOptions.transform = (body, response, resolveWithFullResponse) => {
			return response;
		};

		let response = await request(uploadOptions);
		avatar = JSON.parse(response.body);
		avatar = avatar.data.user.avatar;
		expect(response.statusCode).to.equal(200);
		expect(avatar).to.be.a('string');
		expect(avatar).to.not.equal(null);
	});

	it('should be able to replace [profile pic] and old one should not be accessible', async () => {
		var filePath = np.join(__dirname, './assets/valid/pic.jpg');
		var fileName = np.basename(filePath);
		var type = mime.contentType(fileName);
		var file = fs.createReadStream(filePath);
		var uploadOptions = {
			method: 'POST',
			uri: options.uri,
			formData: {
				name: makeUniqueString(),
				avatar: {
					value: file,
					options: {
						filename: fileName,
						contentType: type,
					},
				},
			},
			headers: {
				'content-type': 'multipart/form-data',
			},
		};

		uploadOptions.transform = (body, response, resolveWithFullResponse) => {
			return response;
		};

		// Update Profile Pic
		let response = await request(uploadOptions);
		let oldAvatar = avatar;
		let newAvatar = JSON.parse(response.body);
		newAvatar = newAvatar.data.user.avatar;
		expect(response.statusCode).to.equal(200);
		expect(newAvatar).to.be.a('string');
		expect(newAvatar).to.not.equal(null);
		expect(newAvatar).to.not.equal(oldAvatar);

		// Check Old Profile Pic
		options.method = 'GET';
		options.uri = signPath('/images/' + oldAvatar, 'GET');
		await checkStatusCodeByOptions(options, 400);
	});

	// Positive Tests for base data integrity
	it('should retain [base data] if not included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let response = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['languages'] = null;
		response = await request(options);

		expect(response.data.user.name).to.equal(userData.name);
		expect(response.data.user.handle).to.equal(userData.handle);
		expect(response.data.user.birth_date).to.equal(userData.birth_date);
		expect(response.data.user.gdpr_consent).to.equal(userData.gdpr_consent);
	});

	it('should retain [preferences.lang] if not included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let response = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['name'] = null;
		response = await request(options);
		expect(response.data.user.preferences.lang).to.equal(userData.preferences.lang);
	});

	it('should retain [preferred_currency] if not included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let response = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['name'] = null;
		response = await request(options);

		expect(response.data.user.preferences.currency).to.equal(userData.preferences.currency);
	});

	it('should retain [educations] if not included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let response = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['name'] = null;
		response = await request(options);

		expect(response.data.user.educations.length).to.equal(userData.educations.length);
	});

	it('should retain [contact] if not included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let response = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['name'] = null;
		response = await request(options);

		expect(response.data.user.contact.phone_prefix).to.equal(userData.contact.phone_prefix);
		expect(response.data.user.contact.phone).to.equal(userData.contact.phone);
		expect(response.data.user.contact.linkedin).to.equal(userData.contact.linkedin);
		expect(response.data.user.contact.twitter).to.equal(userData.contact.twitter);
	});

	it('should retain [wine_knowledge] if not included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let response = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['name'] = null;

		response = await request(options);

		expect(response.data.user.wine_knowledge).to.equal(userData.wine_knowledge);
	});

	it('should retain [address] if not included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let response = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['name'] = null;
		response = await request(options);

		expect(response.data.user.address.info1).to.equal(userData.address.info1);
		expect(response.data.user.address.info2).to.equal(userData.address.info2);
		expect(response.data.user.address.region).to.equal(userData.address.region);
		expect(response.data.user.address.country_code).to.equal(userData.address.country_code);
	});

	it('should retain [languages] if not included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let response = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['name'] = null;
		response = await request(options);

		expect(response.data.user.languages.length).to.equal(userData.languages.length);
	});

	it('should retain [interests] if not included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let response = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['name'] = null;
		response = await request(options);

		expect(response.data.user.interests.length).to.equal(userData.interests.length);
	});

	it('Should only update [name] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['name'] = makeUniqueString();
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'name');
	});

	it('Should only update [handle] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['handle'] = makeUniqueString();
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'handle');
	});

	it('Should only update [birth_date] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['birth_date'] = '1990-01-15 00:00:00';
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'birth_date');
	});

	it('Should only update [gdpr_consent] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['gdpr_consent'] = '2019-01-15 00:00:00';
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'gdpr_consent');
	});

	it('Should only update [email] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		``;
		options.body['email'] = 'email_' + makeUniqueString() + '@ntbl-api.com';
		let updatedData = await request(options);

		// specific test for ensuring email update is disabled
		expect(originalData.data.user.email).to.equal(updatedData.data.user.email);

		// todo : restore email original update test
		// checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'email');
	});

	it('Should only update [preferred_lang] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['preferred_lang'] = '_1';
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'preferred_lang');
	});

	it('Should only update [preferred_currency] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['preferred_currency'] = 'DKK';
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'preferred_currency');
	});

	it('Should only update [educations] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['educations'] = [
			{
				school: makeUniqueString(),
				description: makeUniqueString(300),
				achievement: makeUniqueString(),
				completed: true,
				year: 2025,
				country_code: 'DK',
			},
			{
				school: makeUniqueString(),
				description: makeUniqueString(300),
				achievement: makeUniqueString(),
				completed: false,
				year: 2025,
				country_code: 'DK',
			},
		];
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'educations');
	});

	it('Should only update [contact] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['contact'] = {
			phone_prefix: '+' + randomPhone(1000, 9999),
			phone: randomPhone().toString(),
			linkedin: 'http://linkedin.com/' + makeUniqueString(),
			twitter: 'http://twitter.com/' + makeUniqueString(),
		};
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'contact');
	});

	it('Should only update [wine_knowledge] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['wine_knowledge'] = 'wine_producer';
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'wine_knowledge');
	});

	it('Should only update [address] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['address'] = {
			info1: 'Funkevænget',
			info2: '27',
			region: 'Sjælland',
			city: 'Frederiksberg C',
			postal_code: '1529',
			country_code: 'DK',
		};
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'address');
	});

	it('Should only update [languages] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['languages'] = ['French', 'Italian'];
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'languages');
	});

	it('Should only update [interests] and not affect other fields if it is the only one included in the payload', async () => {
		let userData = generateUserProfileData();
		options.body = userData;

		// Update Full Data
		let originalData = await request(options);

		// Update Other Aspect of User Profile
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		options.body = {};
		options.body['interests'] = [
			{
				value: 'Denmark',
				key: 'country',
			},
			{
				value: 'true',
				key: 'newsletter',
			},
		];
		let updatedData = await request(options);

		checkRetainedUserProfile(originalData.data.user, updatedData.data.user, 'interests');
	});

	// Negative Tests for base data
	it('should fail if [payload] is empty', async () => {
		// init payload
		options.body = null;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if user sends an already taken [handle]', async () => {
		// mainUser must not be able to take testUser's handle
		let profileData = generateUserProfileData();
		profileData['handle'] = testUserProfile.handle;
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if user sends an already taken [email]', async () => {
		// mainUser must not be able to take testUser's email
		let profileData = generateUserProfileData();
		profileData['email'] = testUserProfile.email;
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if user sends an empty [email]', async () => {
		let profileData = generateUserProfileData();
		profileData['email'] = '';
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if user sends a null [email]', async () => {
		let profileData = generateUserProfileData();
		profileData['email'] = null;
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if user sends a invalid [email] format', async () => {
		let profileData = generateUserProfileData();
		profileData['email'] = makeUniqueString();
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	// Negative tests for contact
	it('should fail if [phone_prefix] contains invalid characters [any other character than plus sign]', async () => {
		let profileData = generateUserProfileData();
		profileData['contact'] = {
			phone_prefix: '+' + makeUniqueString(4),
			phone: randomPhone().toString(),
		};
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [phone_prefix] contains invalid characters [plus followed by zeroes]', async () => {
		let profileData = generateUserProfileData();
		profileData['contact'] = {
			phone_prefix: '+0045',
			phone: randomPhone().toString(),
		};
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [phone_prefix] contains invalid characters [multiple zeroes]', async () => {
		let profileData = generateUserProfileData();
		profileData['contact'] = {
			phone_prefix: '0045',
			phone: randomPhone().toString(),
		};
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [phone_prefix] contains invalid characters [all zeroes]', async () => {
		let profileData = generateUserProfileData();
		profileData['contact'] = {
			phone_prefix: '00000',
			phone: randomPhone().toString(),
		};
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [phone_prefix] exceeds 5 characters', async () => {
		let profileData = generateUserProfileData();
		profileData['contact'] = {
			phone_prefix: '+' + makeUniqueString(5),
			phone: randomPhone().toString(),
		};
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [phone] contains invalid characters', async () => {
		let profileData = generateUserProfileData();
		profileData['contact'] = {
			phone_prefix: '+' + randomPhone(1000, 9999),
			phone: makeUniqueString(),
		};
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [phone] exceeds 15 characters', async () => {
		let profileData = generateUserProfileData();
		profileData['contact'] = {
			phone_prefix: '+' + randomPhone(1000, 9999),
			phone: '1234567890123456',
		};
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [linkedin] url is longer than 150 characters', async () => {
		let profileData = generateUserProfileData();
		profileData['contact'] = {
			phone: randomPhone().toString(),
			linkedin: 'http://linkedin.com/' + makeUniqueString(131),
			twitter: 'http://twitter.com/' + makeUniqueString(131),
		};
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [twitter] url is longer than 150 characters', async () => {
		let profileData = generateUserProfileData();
		profileData['contact'] = {
			phone: randomPhone().toString(),
			linkedin: 'http://linkedin.com/' + makeUniqueString(130),
			twitter: 'http://twitter.com/' + makeUniqueString(132),
		};
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if user sends a malformed url for [linkedin] ', async () => {
		let profileData = generateUserProfileData();

		profileData['contact'] = {
			phone: randomPhone().toString(),
			linkedin: 'not a url',
			twitter: 'http://twitter.com/' + makeUniqueString(120),
		};

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if user sends a malformed url for [twitter] ', async () => {
		let profileData = generateUserProfileData();

		profileData['contact'] = {
			phone: randomPhone().toString(),
			linkedin: 'http://linkedin.com/' + makeUniqueString(120),
			twitter: 'not a url',
		};

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	// Negative tests for address
	it('should fail if [demographic.address.info1] exceeds 255 characters', async () => {
		let profileData = generateUserProfileData();

		profileData['address'] = {
			info1: makeUniqueString(256),
			info2: 'Torv 2',
			region: 'Hovedstaden',
			city: 'Copenhagen',
			postal_code: '2100',
			country_code: 'DK',
		};

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [demographic.address.info2] exceeds 255 characters', async () => {
		let profileData = generateUserProfileData();

		profileData['address'] = {
			info1: 'Østerfælled',
			info2: makeUniqueString(256),
			region: 'Hovedstaden',
			city: 'Copenhagen',
			postal_code: '2100',
			country_code: 'DK',
		};

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [demographic.address.region] exceeds 255 characters', async () => {
		let profileData = generateUserProfileData();

		profileData['address'] = {
			info1: 'Østerfælled',
			info2: 'Torv 2',
			region: makeUniqueString(256),
			city: 'Copenhagen',
			postal_code: '2100',
			country_code: 'DK',
		};

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [demographic.address.locality.name] exceeds 255 characters', async () => {
		let profileData = generateUserProfileData();

		profileData['address'] = {
			info1: 'Østerfælled',
			info2: 'Torv 2',
			region: 'Hovedstaden',
			city: makeUniqueString(256),
			postal_code: '2100',
			country_code: 'DK',
		};

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [demographic.address.locality.postalcode] exceeds 15 characters', async () => {
		let profileData = generateUserProfileData();

		profileData['address'] = {
			info1: 'Østerfælled',
			info2: 'Torv 2',
			region: 'Hovedstaden',
			city: 'Copenhagen',
			postal_code: makeUniqueString(16),
			country_code: 'DK',
		};

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [demographic.address.locality.country_code] && [demographic.address.country_code] is an invalid 2 letter country abbreviation', async () => {
		let profileData = generateUserProfileData();

		profileData['address'] = {
			info1: 'Østerfælled',
			info2: 'Torv 2',
			region: 'Hovedstaden',
			city: 'Copenhagen',
			postal_code: '2100',
			country_code: '!' + makeUniqueString(1),
		};

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [demographic.address.locality.country_code] && [demographic.address.country_code] exceeds 2 characters', async () => {
		let profileData = generateUserProfileData();

		profileData['address'] = {
			info1: 'Østerfælled',
			info2: 'Torv 2',
			region: 'Hovedstaden',
			city: 'Copenhagen',
			postal_code: '2100',
			country_code: makeUniqueString(3),
		};

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	// Negative tests for languages
	it('should fail if [demographic.languages] is not an array', async () => {
		let profileData = generateUserProfileData();
		profileData['languages'] = 'notanarray';
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [demographic.languages.*] exceeds 255 characters', async () => {
		let profileData = generateUserProfileData();
		profileData['languages'] = [makeUniqueString(256)];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [demographic.languages.*] exceeds 5 items', async () => {
		let profileData = generateUserProfileData();
		profileData['languages'] = [
			makeUniqueString(255),
			makeUniqueString(255),
			makeUniqueString(255),
			makeUniqueString(255),
			makeUniqueString(255),
			makeUniqueString(255),
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	// Negative tests for languages
	it('should fail if [interests] is not an array', async () => {
		let profileData = generateUserProfileData();
		profileData['interests'] = 'notanarray';
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [interests.value] exceeds 255 characters', async () => {
		let profileData = generateUserProfileData();
		profileData['interests'] = [
			{
				value: makeUniqueString(256),
				key: 'country',
			},
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [interests.key] is not a valid [interest_type] key', async () => {
		let profileData = generateUserProfileData();
		profileData['interests'] = [
			{
				value: makeUniqueString(255),
				key: '!' + makeUniqueString(5),
			},
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	// Negative tests for educations
	it('should fail if [educations] is not an array', async () => {
		let profileData = generateUserProfileData();
		profileData['educations'] = 'notanarray';
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [educations.school] is null', async () => {
		let profileData = generateUserProfileData();
		profileData['educations'] = [
			{
				school: null,
				description: makeUniqueString(300),
				achievement: makeUniqueString(),
				completed: false,
				year: 2025,
				country_code: 'DK',
			},
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [educations.school] exceeds the max chars of 255', async () => {
		let profileData = generateUserProfileData();
		profileData['educations'] = [
			{
				school: makeUniqueString(256),
				description: makeUniqueString(300),
				achievement: makeUniqueString(),
			},
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [educations.school] exceeds the max chars of 255', async () => {
		let profileData = generateUserProfileData();
		profileData['educations'] = [
			{
				school: makeUniqueString(),
				description: makeUniqueString(300),
				achievement: makeUniqueString(256),
			},
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [educations.description] exceeds the max chars of 4000', async () => {
		let profileData = generateUserProfileData();
		profileData['educations'] = [
			{
				school: makeUniqueString(256),
				description: makeUniqueString(4001),
				achievement: makeUniqueString(),
			},
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if education.year is not valid', async () => {
		let profileData = generateUserProfileData();
		profileData['educations'] = [
			{
				school: null,
				description: makeUniqueString(300),
				achievement: makeUniqueString(),
				completed: false,
				year: makeUniqueString(),
				country_code: 'DK',
			},
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [educations.completed] is not valid', async () => {
		let profileData = generateUserProfileData();
		profileData['educations'] = [
			{
				school: null,
				description: makeUniqueString(300),
				achievement: makeUniqueString(),
				completed: makeUniqueString(),
				year: 2025,
				country_code: 'DK',
			},
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [educations.country_code] is not valid', async () => {
		let profileData = generateUserProfileData();
		profileData['educations'] = [
			{
				school: null,
				description: makeUniqueString(300),
				achievement: makeUniqueString(),
				completed: makeUniqueString(),
				year: 2025,
				country_code: '!' + makeUniqueString(1),
			},
		];
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [educations] exceeds 5 items', async () => {
		let profileData = generateUserProfileData();

		profileData['educations'] = [];

		for (let ctr = 1; ctr <= 6; ctr++) {
			profileData['educations'].push({
				school: makeUniqueString(255),
				description: makeUniqueString(4000),
				achievement: makeUniqueString(),
				completed: true,
				year: 2025,
				country_code: 'DK',
			});
		}

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	// Negative tests for wine_knowledge
	it('should fail if [title_key] is non existing [user_title]', async () => {
		let userProfileFromUpdate = generateUserProfileData();
		options.body = userProfileFromUpdate;
		let response = await request(options);

		let profileData = generateUserProfileData();
		profileData['wine_knowledge'] = makeUniqueString(16);

		options.body = profileData;
		options.uri = signPath(updateProfilePath, updateProfileMethod);
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [title_key] is not a [validRef]', async () => {
		let profileData = generateUserProfileData();
		profileData['wine_knowledge'] = '!@#$%^';

		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	// Negative tests for preferred_lang
	it('should fail if [filled] [preferences.lang] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['preferences'].lang = '';
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [filled] [preferences.lang] is null', async () => {
		options.body = generateUserProfileData();
		options.body['preferences'].lang = null;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if user sends an invalid lang key for [preferences.lang]', async () => {
		let profileData = generateUserProfileData();
		profileData['preferences'].lang = '!' + makeUniqueString(2);
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [preferences.lang] exceeds 3 characters', async () => {
		let profileData = generateUserProfileData();
		profileData['preferences'].lang = makeUniqueString(4);
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	// Negative tests for preferences.currency
	it('should fail if [filled] [preferences.currency] is empty', async () => {
		options.body = generateUserProfileData();
		options.body['preferences'].currency = '';
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [filled] [preferences.currency] is null', async () => {
		options.body = generateUserProfileData();
		options.body['preferences'].currency = null;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if user sends an invalid lang key for [preferences.currency]', async () => {
		let profileData = generateUserProfileData();
		profileData['preferences'].currency = '!' + makeUniqueString(2);
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail if [preferences.currency] exceeds 3 characters', async () => {
		let profileData = generateUserProfileData();
		profileData['preferences'].currency = makeUniqueString(4);
		options.body = profileData;
		await checkStatusCodeByOptions(options, 400);
	});

	it('should fail when uploading invalid file extensions', async () => {
		for (const ext of invalidFileExts) {
			var filePath = np.join(__dirname, './assets/invalid/wine' + ext);
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath(updateProfilePath, updateProfileMethod),
				formData: {
					name: makeUniqueString(),
					avatar: {
						value: file,
						options: {
							filename: fileName,
							contentType: type,
						},
					},
				},
				headers: {
					'content-type': 'multipart/form-data',
				},
			};

			uploadOptions.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			await checkStatusCodeByOptions(uploadOptions, 400);
		}
	});
});
