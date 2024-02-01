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
	let options, baseUserPath, user, userData, userB, userBData, userC, userCData, subscription;

	before(async () => {
		options = {...basePostOptions};
		baseUserPath = baseUrl + '/user';

		// Create user (with subscription)
		user = generateUserData();
		user.name = makeUniqueString();
		user.handle = makeUniqueString();
		userData = await createItem(baseUserPath, user);
		user.ref = userData.data.ref;

		// Create another user (with subscription)
		userB = generateUserData();
		userB.name = makeUniqueString();
		userB.handle = makeUniqueString();
		userBData = await createItem(baseUserPath, userB);
		userB.ref = userBData.data.ref;

		// Create yet another user (without subscription)
		userC = generateUserData();
		userC.name = makeUniqueString();
		userC.handle = makeUniqueString();
		userCData = await createItem(baseUserPath, userC);
		userC.ref = userCData.data.ref;

		// Create subscription to [delay-cancel] with
		await login(user.email, user.rawPass);
		let token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};

		subscription = await request(options);

		// Create subscription to [cancel] with
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

	describe('Delayed Cancel', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = {
				cancellation_message: 'Switching providers',
				reason_code: 'TEST',
			};
			options.method = 'POST';
			options.uri = signPath('/subscription/delayed-cancel', 'POST');
		});

		/* Positive tests */
		it('Should be successful and return proper data', async () => {
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
			expect(data.active_plan).to.equal('basic');
			expect(data.end_date).to.equal(null);
			expect(data.canceled_at).to.equal(null);
			expect(data.delayed_cancel_at).to.not.equal(null); // delayed_cancel_at should have a value
		});

		/* Negative tests */
		it('Should not be able to [delay-cancel] a subscription that is already [delay-cancelled]', async () => {
			options.uri = signPath('/subscription/delayed-cancel', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to [delay-cancel] a subscription that is [cancelled]', async () => {
			await login(userB.email, userB.rawPass);
			options.uri = signPath('/subscription/cancel', 'POST');
			await request(options);
			options.uri = signPath('/subscription/delayed-cancel', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to [delay-cancel] with a user who has no subscriptions', async () => {
			await login(userC.email, userC.rawPass);
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to [delay-cancel] a [trial] subscription', async () => {
			await login(userC.email, userC.rawPass);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
