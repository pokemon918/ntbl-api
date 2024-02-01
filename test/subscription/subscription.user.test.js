const expect = require('chai').expect;
const request = require('request-promise');

const {
	baseUrl,
	basePostOptions,
	generateUserData,
	generateChargifyToken,
	makeUniqueString,
	makeRandomInt,
	login,
	signPath,
	createItem,
	checkStatusCodeByOptions,
	checkUserPlan,
} = require('../common.js');

describe('Subscription', () => {
	let options, baseUserPath, user, userData, subscription;
	const BASIC_TO_PRO = process.env.BASIC_TO_PRO;

	before(async () => {
		options = {...basePostOptions};
		baseUserPath = baseUrl + '/user';

		// Create user
		user = generateUserData();
		user.name = makeUniqueString();
		user.handle = makeUniqueString();
		userData = await createItem(baseUserPath, user);
		user.ref = userData.data.ref;

		// Simulate login for user
		await login(user.email, user.rawPass);

		// Create a subscription to fetch with
		let token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};
		subscription = await request(options);
	});

	describe('User Subscription', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/subscription');
		});

		/* Positive tests */
		it('Should be successful', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('Should return proper data', async () => {
			let response = await request(options);

			//Check for Properties
			checkUserPlan(response);

			//Check Data
			expect(response.status).to.equal('active');

			/* 
				Note: #ref: api/2796				
				As of 04/20/20, the logic to automatically upgrade basicToPro has been disabled by default, thus, the expected output has been changed.
				expect(response.active_plan).to.equal('pro');
				expect(response.future_plan).to.equal('basic');

				As of 06/13/20, Added .env var BASIC_TO_PRO to enable and disable the feature, modified the test to consider the value. ref: bug/2069
			*/

			if (BASIC_TO_PRO == 'true') {
				expect(response.active_plan).to.equal('pro');
				expect(response.future_plan).to.equal('basic');
			} else {
				expect(response.active_plan).to.equal('basic');
				expect(response.future_plan).to.equal('');
			}
		});
	});
});
