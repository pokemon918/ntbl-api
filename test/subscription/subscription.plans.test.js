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

		// Simulate login for user
		await login(user.email, user.rawPass);
	});

	describe('Get Plans', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/subscription/plans');
		});

		/* Positive tests */
		it('Should be successful', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('Should return proper data', async () => {
			let response = await request(options);
			expect(response).to.be.an('array');
			for (let ctr = 0; ctr <= response.length - 1; ctr++) {
				let subscriptionPlan = response[ctr];
				let objectKey = Object.keys(subscriptionPlan)[0];

				// todo : remove hardcoded urls then re-enable api fetch api/1504
				// expect(subscriptionPlan[objectKey]).to.have.property('name');
				// expect(subscriptionPlan[objectKey]).to.have.property('description');
				// expect(subscriptionPlan[objectKey]).to.have.property('price');

				expect(subscriptionPlan[objectKey]).to.have.property('url');
			}
		});
	});
});
