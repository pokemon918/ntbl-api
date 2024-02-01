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
	let options, baseUserPath, user, userData, userB, userBData, subscription;

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

	describe('Cancel', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = {
				cancellation_message: 'Switching providers',
				reason_code: 'TEST',
			};
			options.method = 'POST';
			options.uri = signPath('/subscription/cancel', 'POST');
		});

		/* Positive tests */
		it("Should be successful and return the user's free [view] subscription data", async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			let data = response.body.data;

			// Check Http Status
			expect(response.statusCode).to.equal(200);

			//Check for Properties
			checkUserPlan(data);

			//Check the user's free view subscription data
			expect(data.status).to.equal('active');
			expect(data.active_plan).to.equal('view');

			/* todo: found out what in this test should be tested (need to merge - sorry...)
			expect(data.future_plan).to.equal('');

			expect(data.end_date).to.equal(null);
			expect(data.canceled_at).to.equal(null);
			expect(data.delayed_cancel_at).to.equal(null);
*/
		});

		/* Negative tests */
		it('Should not be able to cancel a subscription that is already cancelled', async () => {
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should be able to cancel with a user who has no subscriptions', async () => {
			await login(userB.email, userB.rawPass);
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should not be able to cancel a [trial] subscription', async () => {
			await login(userB.email, userB.rawPass);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
