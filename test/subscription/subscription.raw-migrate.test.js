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

// todo: API/1947
describe('Subscription', () => {
	let options, baseUserPath, user, userData, subscription;

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

		// Create a subscription to cancel with
		let token = await generateChargifyToken();
		options.uri = signPath('/subscription', 'POST');
		options.body = {
			chargify_token: token,
			membership_plan: 'basic',
		};
		subscription = await request(options);
	});

	describe('RAW Migrate', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.body = {};
			options.uri = signPath('/raw/subscription/migration', 'POST');
		});

		/* Positive tests */
		it('Should be successful and return proper data when migrating to pro', async () => {
			options.body = {
				product_handle: 'pro',
			};
			let response = await request(options);
			let migratedSubscription = response.data.subscription;
			expect(migratedSubscription.product.handle).to.equal('pro');

			// Call the refresh API
			options.method = 'GET';
			options.uri = signPath('/subscription/refresh', 'GET');
			await request(options);

			// Double check the user/plan API
			options.method = 'GET';
			options.uri = signPath('/user/plan', 'GET');
			let plan = await request(options);
			expect(plan.future_plan).to.equal('');
			expect(plan.active_plan).to.equal('pro');
		});

		it('Should be successful and return proper data when migrating to scholar', async () => {
			options.body = {
				product_handle: 'scholar',
			};
			let response = await request(options);
			let migratedSubscription = response.data.subscription;
			expect(migratedSubscription.product.handle).to.equal('scholar');

			// Call the refresh API
			options.method = 'GET';
			options.uri = signPath('/subscription/refresh', 'GET');
			await request(options);

			// Double check the user/plan API
			options.method = 'GET';
			options.uri = signPath('/user/plan', 'GET');
			let plan = await request(options);
			expect(plan.future_plan).to.equal('');
			expect(plan.active_plan).to.equal('scholar');
		});

		/*
		|--------------------------------------------------------------------------
		| Negative Tests
		|--------------------------------------------------------------------------
		*/
		it('Should return an error when migrating to an empty payload', async () => {
			// Migrate to pro for the first time
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error when migrating to an empty[null] product_handle (plan)', async () => {
			// Migrate to pro for the first time
			options.body = {
				product_handle: null,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error when migrating to an empty[string] product_handle (plan)', async () => {
			// Migrate to pro for the first time
			options.body = {
				product_handle: '',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error when migrating to a non-existing product_handle (plan)', async () => {
			// Migrate to pro for the first time
			options.body = {
				product_handle: makeUniqueString(),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error when migrating to the same product_handle (plan) twice', async () => {
			// Migrate to pro for the first time
			options.body = {
				product_handle: 'pro',
			};
			let response = await request(options);
			let migratedSubscription = response.data.subscription;
			expect(migratedSubscription.product.handle).to.equal('pro');

			// Migrate to pro for the second time
			options.body = {
				product_handle: 'pro',
			};
			options.uri = signPath('/raw/subscription/migration', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
