const expect = require('chai').expect;
const request = require('request-promise');
const webhookSample = require('./data/webhook.sample.json');
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
	let options, baseUserPath, user, userData, eventId, subscriptionId;

	before(async () => {
		options = {...basePostOptions};
		baseUserPath = baseUrl + '/user';

		// Unique Unit Test Identifiers
		eventId = 1;
		subscriptionId = 1;

		// Create user
		user = generateUserData();
		user.name = makeUniqueString();
		user.handle = makeUniqueString();
		userData = await createItem(baseUserPath, user);

		// Simulate login for user
		await login(user.email, user.rawPass);
	});

	describe('Handle each known webhook event', () => {
		beforeEach(async () => {
			// Base Options
			options.transform = null;
			options.method = 'POST';
			options.uri = baseUrl + '/webhooks/chargify';

			// Load Base Data
			options.body = webhookSample;

			// Transform Sample Data
			options.body.id = eventId;
			options.body.event = null;
			options.body.payload.subscription.id = subscriptionId;
			options.body.payload.subscription.product.handle = null;
			options.body.payload.subscription.customer.reference = userData.data.ref;
		});

		// What to expect : Find user's local subscription and upgrade it
		describe('signup_success', () => {
			beforeEach(async () => {
				// Transform Test Specific Data
				options.method = 'POST';
				options.body = webhookSample;
				options.body.id = eventId;
				options.body.event = 'signup_success';
				options.body.payload.subscription.id = subscriptionId;
				options.body.payload.subscription.product.handle = 'scholar';
				options.body.payload.subscription.customer.reference = userData.data.ref;
			});

			// Positive Tests
			it('Should be successful', async () => {
				await checkStatusCodeByOptions(options, 200);
			});

			it('should return proper data', async () => {
				let webhookResponse = await request(options);
				expect(webhookResponse).to.have.property('status');
				expect(webhookResponse).to.have.property('message');
				expect(webhookResponse.status).to.equal('success');
				expect(webhookResponse.message).to.equal('Accepted');
				// todo : What happened to user active_plan after webhook event ? requires API/1532
				// What to expect : user should have a higher tier of subscription , based from webhook payload
			});

			// Negative Tests
			it('Should return an error with invalid [webhook_id]', async () => {
				options.body.id = null;
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [subscription_id]', async () => {
				options.body.payload.subscription.id = null;
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [user_ref]', async () => {
				options.body.payload.subscription.customer.reference = makeUniqueString();
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [product_handle]', async () => {
				options.body.payload.subscription.product.handle = makeUniqueString();
				await checkStatusCodeByOptions(options, 400);
			});
		});

		// What to expect : Find user's local subscription and set it to a expired status
		describe('subscription_state_change', () => {
			beforeEach(async () => {
				// Transform Test Specific Data
				options.method = 'POST';
				options.body = webhookSample;
				options.body.id = eventId;
				options.body.event = 'subscription_state_change';
				options.body.payload.subscription.id = subscriptionId;
				options.body.payload.subscription.product.handle = 'scholar';
				options.body.payload.subscription.state = 'canceled';
				options.body.payload.subscription.customer.reference = userData.data.ref;
			});

			// Positive Tests
			it('Should be successful', async () => {
				await checkStatusCodeByOptions(options, 200);
			});

			it('should return proper data', async () => {
				let webhookResponse = await request(options);
				expect(webhookResponse).to.have.property('status');
				expect(webhookResponse).to.have.property('message');
				expect(webhookResponse.status).to.equal('success');
				expect(webhookResponse.message).to.equal('Accepted');
				// todo : What happened to user active_plan after webhook event ? requires API/1532
				// Does it REALLY require API/1532 ???
				// What to expect : User's product should be of a free type , because subscription ran out
			});

			// Negative Tests
			it('Should return an error with invalid [webhook_id]', async () => {
				options.body.id = null;
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [subscription_id]', async () => {
				options.body.payload.subscription.id = null;
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [user_ref]', async () => {
				options.body.payload.subscription.customer.reference = makeUniqueString();
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [product_handle]', async () => {
				options.body.payload.subscription.product.handle = makeUniqueString();
				await checkStatusCodeByOptions(options, 400);
			});
		});

		describe('subscription_product_change', () => {
			beforeEach(async () => {
				// Transform Test Specific Data
				options.method = 'POST';
				options.body = webhookSample;
				options.body.id = eventId;
				options.body.event = 'subscription_product_change';
				options.body.payload.subscription.id = subscriptionId;
				options.body.payload.subscription.product.handle = 'scholar';
				options.body.payload.subscription.customer.reference = userData.data.ref;
			});

			// Positive Tests
			it('Should be successful', async () => {
				await checkStatusCodeByOptions(options, 200);
			});

			it('should return proper data', async () => {
				let webhookResponse = await request(options);
				expect(webhookResponse).to.have.property('status');
				expect(webhookResponse).to.have.property('message');
				expect(webhookResponse.status).to.equal('success');
				expect(webhookResponse.message).to.equal('Accepted');
				// todo : What happened to user active_plan after webhook event ? requires API/1532
				// What to expect : User's product type should be the one from webhook
			});

			// Negative Tests
			it('Should return an error with invalid [webhook_id]', async () => {
				options.body.id = null;
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [subscription_id]', async () => {
				options.body.payload.subscription.id = null;
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [user_ref]', async () => {
				options.body.payload.subscription.customer.reference = makeUniqueString();
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [product_handle]', async () => {
				options.body.payload.subscription.product.handle = makeUniqueString();
				await checkStatusCodeByOptions(options, 400);
			});
		});

		describe('payment_failure', () => {
			beforeEach(async () => {
				// Transform Test Specific Data
				options.method = 'POST';
				options.body = webhookSample;
				options.body.id = eventId;
				options.body.event = 'payment_failure';
				options.body.payload.subscription.id = subscriptionId;
				options.body.payload.subscription.product.handle = 'scholar';
				options.body.payload.subscription.customer.reference = userData.data.ref;
			});

			// Positive Tests
			it('Should be successful', async () => {
				await checkStatusCodeByOptions(options, 200);
			});

			it('should return proper data', async () => {
				let webhookResponse = await request(options);
				expect(webhookResponse).to.have.property('status');
				expect(webhookResponse).to.have.property('message');
				expect(webhookResponse.status).to.equal('success');
				expect(webhookResponse.message).to.equal('Accepted');
				// todo : What happened to user active_plan after webhook event ? requires API/1532
				// What to expect : User's product should be of a free type , because he failed to pay what he owes
			});

			// Negative Tests
			it('Should return an error with invalid [webhook_id]', async () => {
				options.body.id = null;
				await checkStatusCodeByOptions(options, 400);
			});

			it('Should return an error with invalid [subscription_id]', async () => {
				options.body.payload.subscription.id = null;
				await checkStatusCodeByOptions(options, 400);
			});
		});
	});
});
