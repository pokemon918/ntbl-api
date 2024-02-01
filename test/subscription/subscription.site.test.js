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
	let options, baseUserPath, user, userData, userB, userBData, subscriptions;

	before(async () => {
		options = {...basePostOptions};
		baseUserPath = baseUrl + '/user';

		// Create user
		user = generateUserData();
		user.name = makeUniqueString();
		user.handle = makeUniqueString();
		userData = await createItem(baseUserPath, user);
		user.ref = userData.data.ref;

		// Create another user
		userB = generateUserData();
		userB.name = makeUniqueString();
		userB.handle = makeUniqueString();
		userBData = await createItem(baseUserPath, userB);
		userB.ref = userBData.data.ref;

		// Create subscriptions to fetch with
		subscriptions = [];
		await login(user.email, user.rawPass);
		let token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};
		let subscriptionResponse = await request(options);
		subscriptions.push(subscriptionResponse.data.subscription_id);

		await login(userB.email, userB.rawPass);
		token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};
		let anotherSubscriptionResponse = await request(options);
		subscriptions.push(anotherSubscriptionResponse.data.subscription_id);
	});

	describe('Site Subscriptions', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath('/admin/subscription', 'GET');
		});

		/* Positive tests */
		it('Should be successful', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('Should return proper data', async () => {
			let response = await request(options);
			let subscriptionIds = response.map((o) => o.subscription_id);
			let intersection = subscriptions.filter((subscription_id) =>
				subscriptionIds.includes(subscription_id)
			);

			expect(response).to.be.an('array');
			expect(intersection.length).to.equal(subscriptions.length);

			response.forEach(function (subscription) {
				checkUserPlan(subscription);
			});
		});
	});
});
