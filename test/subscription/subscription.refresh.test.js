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
	let options,
		baseUserPath,
		user,
		userData,
		userB,
		userBData,
		userC,
		userCData,
		userD,
		userDData,
		userE,
		userEData,
		subscription;

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

		// Create another user (without subscription)
		userB = generateUserData();
		userB.name = makeUniqueString();
		userB.handle = makeUniqueString();
		userBData = await createItem(baseUserPath, userB);
		userB.ref = userBData.data.ref;

		// Create another user (without subscription)
		userC = generateUserData();
		userC.name = makeUniqueString();
		userC.handle = makeUniqueString();
		userCData = await createItem(baseUserPath, userC);
		userC.ref = userCData.data.ref;

		// Create another user (for UPGRADE test)
		userD = generateUserData();
		userD.name = makeUniqueString();
		userD.handle = makeUniqueString();
		userDData = await createItem(baseUserPath, userD);
		userD.ref = userDData.data.ref;

		// Create another user (for DOWNGRADE test)
		userE = generateUserData();
		userE.name = makeUniqueString();
		userE.handle = makeUniqueString();
		userEData = await createItem(baseUserPath, userE);
		userE.ref = userEData.data.ref;

		// Simulate login for user
		await login(user.email, user.rawPass);

		// Create a subscription to cancel with
		let token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};
		subscription = await request(options);
	});

	describe('Refresh', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.body = {};
			options.uri = signPath('/subscription/refresh', 'GET');
		});

		/* Positive tests */
		it('Should be successful and return proper data when subscription already exists in local DB', async () => {
			/*
            	Note: Since we cannot simulate the creation of a subscription the same way like the public signup page,
            	we only used the existing `/subscription` to create the subscription, which means by the time we execute `/subscription/refresh`, 
            	there's already an existing copy of the Chargify subscription in the local DB. 

            	In other words, if a subscription already exists in the DB, `/subscription/refresh` will no longer create a copy of the Chargify subscription
            	nor return an error. Instead, it's going to send the existing one, back to the frontend.
            */

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			let data = response.body.data;

			// Check Http Status
			expect(response.statusCode).to.equal(200);

			//Check for Properties
			checkUserPlan(data);

			//Check Data
			expect(data.status).to.equal('active');

			/* 
				Note: #ref: api/2796
				As of 04/20/20, the logic to automatically upgrade basicToPro has been disabled by default, thus, the expected output has been changed.
				expect(data.active_plan).to.equal('pro');
				expect(data.future_plan).to.equal('basic');

				As of 06/13/20, Added .env var BASIC_TO_PRO to enable and disable the feature, modified the test to consider the value. ref: bug/2069
			*/

			if (BASIC_TO_PRO == 'true') {
				expect(data.active_plan).to.equal('pro');
				expect(data.future_plan).to.equal('basic');
			} else {
				expect(data.active_plan).to.equal('basic');
				expect(data.future_plan).to.equal('');
			}
		});

		it("Should be able to refresh a user's billing portal link as well ", async () => {
			await login(userC.email, userC.rawPass);

			// At this point , user doesn't have any paid subscription
			options.uri = signPath('/user/profile', 'GET');
			let profileBillingResponse = await request(options);
			expect(profileBillingResponse.billing_portal_link).to.equal(null);
			expect(profileBillingResponse.billing_portal_validity).to.equal(null);

			// User subscribes to a paid subscription
			let token = await generateChargifyToken();
			options.method = 'POST';
			options.uri = signPath('/subscription', 'POST');
			options.body = {
				chargify_token: token,
				membership_plan: 'basic',
			};
			let anotherSubscription = await request(options);

			// User refreshes after subscribing
			options.method = 'GET';
			options.body = {};
			options.uri = signPath('/subscription/refresh', 'GET');
			let response = await request(options);

			// User's profile should now have a billing link
			options.method = 'GET';
			options.body = {};
			options.uri = signPath('/user/profile', 'GET');
			profileBillingResponse = await request(options);
			expect(profileBillingResponse.billing_portal_link).to.not.equal(null);
			expect(profileBillingResponse.billing_portal_validity).to.not.equal(null);
		});

		it('Should be able to refresh subscription migration A.K.A simulate when a user selects a different plan [UPGRADE]', async () => {
			// Simulate login for userD
			await login(userD.email, userD.rawPass);

			// Create a subscription for "basic" userD
			let token = await generateChargifyToken();
			options.method = 'POST';
			options.uri = signPath('/subscription', 'POST');
			options.body = {
				chargify_token: token,
				membership_plan: 'basic',
			};
			let subscription = await request(options);

			/* 
				Note: Note: #ref: api/2796
				As of 04/20/20, the logic to automatically upgrade basicToPro has been disabled by default, thus, the expected output has been changed.
				expect(subscription.data.future_plan).to.equal('basic');
				expect(subscription.data.active_plan).to.equal('pro');
			*/
			if (BASIC_TO_PRO == 'true') {
				expect(subscription.data.future_plan).to.equal('basic');
				expect(subscription.data.active_plan).to.equal('pro');
			} else {
				expect(subscription.data.future_plan).to.equal('');
				expect(subscription.data.active_plan).to.equal('basic');
			}

			// Create a migration that would upgrade userD's subscription to "scholar"
			options.uri = signPath('/raw/subscription/migration', 'POST');
			options.body = {
				product_handle: 'scholar',
			};
			let response = await request(options);
			let migratedSubscription = response.data.subscription;
			expect(migratedSubscription.product.handle).to.equal('scholar');

			// Check the plan BEFORE refreshing | Expect it to be the same as when it was created because the change from remote has not been "refreshed" yet
			options.method = 'GET';
			options.uri = signPath('/user/plan', 'GET');
			let plan = await request(options);

			/* 
				Note: #ref: api/2796
				As of 04/20/20, the logic to automatically upgrade basicToPro has been disabled by default, thus, the expected output has been changed.
				expect(plan.future_plan).to.equal('basic');
				expect(plan.active_plan).to.equal('pro');

				As of 06/13/20, Added .env var BASIC_TO_PRO to enable and disable the feature, modified the test to consider the value. ref: bug/2069
			*/
			if (BASIC_TO_PRO == 'true') {
				expect(plan.future_plan).to.equal('basic');
				expect(plan.active_plan).to.equal('pro');
			} else {
				expect(plan.future_plan).to.equal('');
				expect(plan.active_plan).to.equal('basic');
			}

			// Refresh the subscription
			options.method = 'GET';
			options.uri = signPath('/subscription/refresh', 'GET');
			await request(options);

			// Check the plan AFTER refreshing | Expect the active plan to be the same as the migratedSubscription
			options.method = 'GET';
			options.uri = signPath('/user/plan', 'GET');
			plan = await request(options);
			expect(plan.future_plan).to.equal('');
			expect(plan.active_plan).to.equal('scholar');
		});

		it('Should be able to refresh subscription migration A.K.A simulate when a user selects a different plan [DOWNGRADE]', async () => {
			// Simulate login for userE
			await login(userE.email, userE.rawPass);

			// Create a subscription for "scholar" userE
			let token = await generateChargifyToken();
			options.method = 'POST';
			options.uri = signPath('/subscription', 'POST');
			options.body = {
				chargify_token: token,
				membership_plan: 'scholar',
			};
			let subscription = await request(options);
			expect(subscription.data.future_plan).to.equal('');
			expect(subscription.data.active_plan).to.equal('scholar');

			// Create a migration that would upgrade userE's subscription to "scholar"
			options.uri = signPath('/raw/subscription/migration', 'POST');
			options.body = {
				product_handle: 'basic',
			};
			let response = await request(options);
			let migratedSubscription = response.data.subscription;
			expect(migratedSubscription.product.handle).to.equal('basic');

			// Check the plan BEFORE refreshing | Expect it to be the same as when it was created because the change from remote has not been "refreshed" yet
			options.method = 'GET';
			options.uri = signPath('/user/plan', 'GET');
			let plan = await request(options);
			expect(plan.future_plan).to.equal('');
			expect(plan.active_plan).to.equal('scholar');

			// Refresh the subscription
			options.method = 'GET';
			options.uri = signPath('/subscription/refresh', 'GET');
			await request(options);

			// Check the plan AFTER refreshing | Expect the active plan to be the same as the migratedSubscription
			options.method = 'GET';
			options.uri = signPath('/user/plan', 'GET');
			plan = await request(options);
			expect(plan.future_plan).to.equal('');
			expect(plan.active_plan).to.equal('basic');
		});

		/* Negative tests */
		it('Should return an error if the user requesting can not be found remotely', async () => {
			//Login userB, which do not have a remote subscription
			await login(userB.email, userB.rawPass);
			options.uri = signPath('/subscription/refresh', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
