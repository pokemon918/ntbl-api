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
	generateChargifyToken,
} = require('../common.js');

describe('User', () => {
	describe('Get User Plan', () => {
		let options, baseUserPath, getUserPlanPath, user, userData, userProfile;

		getUserPlanPath = '/user/plan';

		before(async () => {
			options = {...baseGetOptions};
			let createUserPath = baseUrl + '/user';

			// Create and login the user for testing
			user = generateUserData();
			user.name = makeUniqueString();
			user.handle = makeUniqueString();
			await createItem(createUserPath, user);
			await login(user.email, user.rawPass);

			let token = await generateChargifyToken();

			let createSubscriptionPath = signPath('/subscription', 'POST');
			let subscription = {
				chargify_token: token,
				membership_plan: 'basic',
			};
			await createItem(createSubscriptionPath, subscription);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(getUserPlanPath, options.method);
		});

		it('should be successful and return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have proper data', async () => {
			let userPlan = await request(options);
			checkUserPlan(userPlan);
		});
	});
});
