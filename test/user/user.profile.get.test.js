const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	createItem,
	checkStatusCodeByOptions,
	makeUniqueString,
	randomPhone,
	login,
	signPath,
	generateUserData,
	sha256,
	checkForSuccess,
	checkUserProfile,
	checkUserPlan,
} = require('../common.js');

describe('User', () => {
	describe('Get User Profile', () => {
		let options, baseUserPath, getUserProfilePath, user, userData, userProfile;

		getUserProfilePath = '/user/profile';

		const generateUserProfileData = () => {
			let payload = {
				name: makeUniqueString(),
				handle: makeUniqueString(),
				birth_date: '1990-01-14 00:00:00',
				gdpr_consent: '2019-01-14 00:00:00',
				email: 'email_' + makeUniqueString() + '@ntbl-api.com',
				avatar: null,
				preferred_lang: 'en',
				preferred_currency: 'USD',
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

		before(async () => {
			options = {...baseGetOptions};
			let createUserPath = baseUrl + '/user';

			// Create and login the user for testing
			user = generateUserData();
			await createItem(createUserPath, user);
			await login(user.email, user.rawPass);

			// Update the user's profile data for testing comparisons
			let payload = generateUserProfileData();
			let response = await request({
				uri: signPath('/user/profile', 'POST'),
				json: true,
				body: payload,
				method: 'POST',
			});
			userProfile = response.data.user;
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(getUserProfilePath, options.method);
		});

		it('should be successful and return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have proper data', async () => {
			let user = await request(options);
			checkUserProfile(user, userProfile);
			checkUserPlan(user.subscription);
		});

		it('should not have any kind of privileges', async () => {
			let user = await request(options);
			expect(user.badges.length).to.equal(0);
		});
	});
});
