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
		subscription;

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

		// Create another user (without subscription)
		userD = generateUserData();
		userD.name = makeUniqueString();
		userD.handle = makeUniqueString();
		userDData = await createItem(baseUserPath, userD);
		userD.ref = userDData.data.ref;

		// Create subscriptions to [update] with
		await login(user.email, user.rawPass);
		let token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};
		subscription = await request(options);

		await login(userD.email, userD.rawPass);
		token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};
		subscription = await request(options);

		// Create a subscription to [cancel] with
		await login(userB.email, userB.rawPass);
		token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};
		await request(options);

		// Relogin
		await login(user.email, user.rawPass);
	});

	describe('Update', () => {
		beforeEach(async () => {
			options.method = 'POST';
			options.body = {};
			options.uri = signPath('/subscription/change-to/', 'POST');
		});

		/* Positive tests */
		it('Should be successful and return proper data', async () => {
			await login(user.email, user.rawPass);
			let newProductHandle = 'pro';
			options.uri = signPath(`/subscription/change-to/${newProductHandle}`, 'POST');
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
			expect(data.active_plan).to.equal(newProductHandle);
		});

		it('Should be successful and return proper data when using flexible plan keys', async () => {
			await login(userD.email, userD.rawPass);
			let baseHandle = 'pro';
			let newProductHandle = baseHandle + makeUniqueString();
			options.uri = signPath(`/subscription/change-to/${newProductHandle}`, 'POST');
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
			expect(data.active_plan).to.equal(baseHandle);
		});

		/* Negative tests */
		it('Should not be able to update a [trial] subscription to a [better] one', async () => {
			await login(user.email, user.rawPass);
			let newProductHandle = 'pro';
			options.uri = signPath(`/subscription/change-to/${newProductHandle}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to update a subscription with an invalid flexible plan key', async () => {
			await login(userD.email, userD.rawPass);
			let baseHandle = 'pro';
			let newProductHandle = makeUniqueString() + baseHandle;
			options.uri = signPath(`/subscription/change-to/${newProductHandle}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to update a subscription to a [similar] [membership_plan]', async () => {
			await login(user.email, user.rawPass);
			let newProductHandle = 'pro';
			options.uri = signPath(`/subscription/change-to/${newProductHandle}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to update a subscription with an [invalid] [membership_plan]', async () => {
			await login(user.email, user.rawPass);
			let newProductHandle = makeUniqueString();
			options.uri = signPath(`/subscription/change-to/${newProductHandle}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to update an already cancelled subscription', async () => {
			await login(userB.email, userB.rawPass);
			options.body = {
				cancellation_message: 'Switching providers',
				reason_code: 'TEST',
			};
			options.uri = signPath('/subscription/cancel', 'POST');
			await request(options);
			let newProductHandle = 'basic';
			options.body = {};
			options.uri = signPath(`/subscription/change-to/${newProductHandle}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to update with a user who has no subscriptions', async () => {
			await login(userC.email, userC.rawPass);
			let newProductHandle = 'basic';
			options.uri = signPath(`/subscription/change-to/${newProductHandle}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
