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
	let options, baseUserPath, user, userData, userB, userBData, userC, userCData, userD, userDData;
	const BASIC_TO_PRO = process.env.BASIC_TO_PRO;

	before(async () => {
		options = {...basePostOptions};
		baseUserPath = baseUrl + '/user';

		// Create users
		user = generateUserData();
		user.name = makeUniqueString();
		user.handle = makeUniqueString();
		userData = await createItem(baseUserPath, user);
		user.ref = userData.data.ref;

		userB = generateUserData();
		userB.name = makeUniqueString();
		userB.handle = makeUniqueString();
		userBData = await createItem(baseUserPath, userB);
		userB.ref = userBData.data.ref;

		userC = generateUserData();
		userC.name = makeUniqueString();
		userC.handle = makeUniqueString();
		userCData = await createItem(baseUserPath, userC);
		userC.ref = userCData.data.ref;

		userD = generateUserData();
		userD.name = makeUniqueString();
		userD.handle = makeUniqueString();
		userDData = await createItem(baseUserPath, userD);
		userD.ref = userDData.data.ref;

		// Simulate login for user
		await login(user.email, user.rawPass);
	});

	describe('Add', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = {};
			options.method = 'POST';
			options.uri = signPath('/subscription', 'POST');
		});

		/* Positive tests */
		it('Should be successful and return proper data', async () => {
			let token = await generateChargifyToken();
			options.body = {
				chargify_token: token,
				membership_plan: 'basic',
			};
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			let data = response.body.data;

			// Check Http Status
			expect(response.statusCode).to.equal(201);

			//Check for Properties
			checkUserPlan(data);

			//Check Data
			expect(data.status).to.equal('active');

			/* 
				Note: #ref: api/2796
				As of 04/20/20, the logic to automatically upgrade basicToPro has been disabled by default, thus, the expected output has been changed.
				expect(data.future_plan).to.equal(options.body.membership_plan);
				expect(data.active_plan).to.equal('pro');

				As of 06/13/20, Added .env var BASIC_TO_PRO to enable and disable the feature, modified the test to consider the value. ref: bug/2069
			*/

			if (BASIC_TO_PRO == 'true') {
				expect(data.future_plan).to.equal(options.body.membership_plan);
				expect(data.active_plan).to.equal('pro');
			} else {
				expect(data.future_plan).to.equal('');
				expect(data.active_plan).to.equal(options.body.membership_plan);
			}
		});

		it('Should be successful and return proper data when using flexible plan keys', async () => {
			await login(userB.email, userB.rawPass);
			options.uri = signPath('/subscription', 'POST');
			let token = await generateChargifyToken();

			let baseHandle = 'basic';
			options.body = {
				chargify_token: token,
				membership_plan: baseHandle + makeUniqueString(),
			};
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			let data = response.body.data;

			// Check Http Status
			expect(response.statusCode).to.equal(201);

			//Check for Properties
			checkUserPlan(data);

			//Check Data
			expect(data.status).to.equal('active');

			/* 
				Note: #ref: api/2796
				As of 04/20/20, the logic to automatically upgrade basicToPro has been disabled by default, thus, the expected output has been changed.
				expect(data.future_plan).to.equal(baseHandle);
				expect(data.active_plan).to.equal('pro');

				As of 06/13/20, Added .env var BASIC_TO_PRO to enable and disable the feature, modified the test to consider the value. #ref: bug/2069
			*/

			if (BASIC_TO_PRO == 'true') {
				expect(data.future_plan).to.equal(baseHandle);
				expect(data.active_plan).to.equal('pro');
			} else {
				expect(data.future_plan).to.equal('');
				expect(data.active_plan).to.equal(baseHandle);
			}
		});

		/* Negative tests */
		it('Should not be able to create a subscription if a user is already subscribed', async () => {
			options.body = {
				chargify_token: makeUniqueString(),
				membership_plan: 'basic',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to create a subscription with an invalid flexible plan key', async () => {
			await login(userC.email, userC.rawPass);
			let baseHandle = 'basic';
			let token = await generateChargifyToken();
			options.uri = signPath('/subscription', 'POST');
			options.body = {
				chargify_token: token,
				membership_plan: makeUniqueString() + baseHandle,
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to create a subscription with an invalid [token]', async () => {
			await login(userC.email, userC.rawPass);
			options.uri = signPath('/subscription', 'POST');
			options.body = {
				chargify_token: makeUniqueString(),
				membership_plan: 'basic',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to create a subscription with an invalid [membership_plan]', async () => {
			await login(userD.email, userD.rawPass);
			let token = await generateChargifyToken();
			options.body = {
				chargify_token: token,
				membership_plan: makeUniqueString(),
			};

			await checkStatusCodeByOptions(options, 400);
		});
	});
});
