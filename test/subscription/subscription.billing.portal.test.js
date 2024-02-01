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
} = require('../common.js');

describe('Subscription', () => {
	let options, baseUserPath, user, userData;

	before(async () => {
		options = {...basePostOptions};
		baseUserPath = baseUrl + '/user';

		// Create user
		user = generateUserData();
		user.name = makeUniqueString();
		user.handle = makeUniqueString();
		userData = await createItem(baseUserPath, user);
		user.ref = userData.data.ref;

		await login(user.email, user.rawPass);

		// Create a subscription to fetch with
		let token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};
		let subscriptionResponse = await request(options);
	});

	describe('Billing Portal', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/subscription/billing/portal', 'GET');
		});

		/* Positive tests */
		it('Should be successful', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('Should be return proper data', async () => {
			let response = await request(options);
			expect(response).to.have.property('portal_link');
			expect(response.portal_link).to.be.a('string');
		});
	});
});
