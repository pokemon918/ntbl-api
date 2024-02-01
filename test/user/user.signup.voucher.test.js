const chai = require('chai');
const expect = chai.expect;
const request = require('request-promise');
require('chai-date-string')(chai);

const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkCreateStatusCode,
	checkForSuccess,
	signPath,
	login,
	checkUserPlan,
	generateUserData,
	makeUniqueString,
	checkStatusCodeByOptions,
} = require('../common.js');

describe('User', () => {
	describe('Signup with Voucher', () => {
		let options,
			path,
			baseData,
			devVouchers,
			upgradeVouchers,
			remoteVouchers,
			infiniteUsageVoucher,
			infiniteDurationVoucher,
			resetVouchersUsageLimit;

		before(async () => {
			devVouchers = [
				{
					BASIC123: 'basic',
				},
				{
					SCHOLAR123: 'scholar',
				},
				{
					PRO123: 'pro',
				},
				{
					VIEW123: 'view',
				},
			];

			// Note: These codes were taken from root/database/seeds/data/upgrade-vouchers.json
			upgradeVouchers = [
				{
					UB001: 'basic',
				},
				{
					UP001: 'pro',
				},
				{
					USC001: 'scholar',
				},
			];

			// Note: These codes were manually added in the Chargify dashboard for testing purposes
			remoteVouchers = [
				{
					B001: 'basic',
				},
				{
					P001: 'pro',
				},
				{
					SC001: 'scholar',
				},
			];

			options = {...basePostOptions};
			path = baseUrl + '/user';

			// Infinite Usage Voucher
			options.body = {
				plan: 'basic',
				vouchers: [
					{
						code: makeUniqueString(20, true).toUpperCase(),
						valid_days: 1,
						usage_limit: -1,
					},
				],
			};
			options.uri = baseUrl + '/admin/subscription/vouchers?who=tex';
			infiniteUsageVoucher = await request(options);
			infiniteUsageVoucher = infiniteUsageVoucher.data.vouchers[0].code;

			// Infinite Duration Voucher
			options.body = {
				plan: 'basic',
				vouchers: [
					{
						code: makeUniqueString(10, true).toUpperCase(),
						valid_days: -1,
						usage_limit: 1,
					},
				],
			};
			options.uri = baseUrl + '/admin/subscription/vouchers?who=tex';
			infiniteDurationVoucher = await request(options);
			infiniteDurationVoucher = infiniteDurationVoucher.data.vouchers[0].code;

			resetVouchersUsageLimit = async () => {
				let options = {...basePostOptions};
				options.uri = baseUrl + '/raw/subscription/vouchers/reset-usage-limit?who=tex';
				await request(options);
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.uri = baseUrl + '/user';
		});

		afterEach(async () => {
			// Reset the the usage limit for all voucher every after test
			await resetVouchersUsageLimit();
		});

		it('should be successful and return proper data for [DEV] vouchers', async () => {
			for (let ctr = 0; ctr <= devVouchers.length - 1; ctr++) {
				let voucherCode = Object.keys(devVouchers[ctr])[0];
				let subscriptionPlan = devVouchers[ctr][voucherCode];
				let userData = generateUserData();
				userData.voucher = voucherCode;
				let response = await createItem(path, userData, true);
				let subscription = response.body.data.subscription;

				// Check Http Status
				expect(response.statusCode).to.equal(201);

				// Check for Properties
				checkUserPlan(subscription);

				// Check Data
				expect(subscription.active_plan).to.equal(subscriptionPlan);
				expect(subscription.future_plan).to.equal('');
				expect(subscription.status).to.equal('active');
			}
		});

		it('should be successful and return proper data for [UPGRADE] vouchers', async () => {
			for (let ctr = 0; ctr <= upgradeVouchers.length - 1; ctr++) {
				let voucherCode = Object.keys(upgradeVouchers[ctr])[0];
				let subscriptionPlan = upgradeVouchers[ctr][voucherCode];
				let userData = generateUserData();
				userData.voucher = voucherCode;
				let response = await createItem(path, userData, true);
				let subscription = response.body.data.subscription;

				// Check Http Status
				expect(response.statusCode).to.equal(201);

				// Check for Properties
				checkUserPlan(subscription);

				// Check Data
				expect(subscription.active_plan).to.equal(subscriptionPlan);
				expect(subscription.future_plan).to.equal('');
				expect(subscription.status).to.equal('active');
			}
		});

		it('should be successful and return proper data for [REMOTE] vouchers', async () => {
			for (let ctr = 0; ctr <= remoteVouchers.length - 1; ctr++) {
				let voucherCode = Object.keys(remoteVouchers[ctr])[0];
				let subscriptionPlan = remoteVouchers[ctr][voucherCode];
				let userData = generateUserData();
				userData.voucher = voucherCode;
				let response = await createItem(path, userData, true);
				let subscription = response.body.data.subscription;

				// Check Http Status
				expect(response.statusCode).to.equal(201);

				// Check for Properties
				checkUserPlan(subscription);

				// Check Data
				expect(subscription.active_plan).to.equal(subscriptionPlan);
				expect(subscription.future_plan).to.equal('');
				expect(subscription.status).to.equal('active');
			}
		});

		it('should be successful if an infinite [UPGRADE] voucher is used past the default limit', async () => {
			// Note: The usage limit for UPGRADE vouchers are currently set to 10 in the code
			let upgradeVoucherUsageLimit = parseInt(process.env.VOUCHER_DEFAULT_USAGE_LIMIT_LOCAL);

			for (let ctr = 0; ctr < upgradeVoucherUsageLimit + 1; ctr++) {
				// Create user1 which uses the voucherCode
				let user1Data = generateUserData();
				user1Data.voucher = infiniteUsageVoucher;
				let response = await createItem(path, user1Data, true);

				// Since the voucher limit is set to 10, the API should throw an error if a user tries to use the voucher
				if (ctr == upgradeVoucherUsageLimit - 1) {
					let user2Data = generateUserData();
					user2Data.voucher = infiniteUsageVoucher;
					options.body = user2Data;
					await checkStatusCodeByOptions(options, 201);
				}
			}
		});

		it('should be successful and return proper data for [infinite duration] vouchers', async () => {
			let userData = generateUserData();
			userData.voucher = infiniteDurationVoucher;
			let response = await createItem(path, userData, true);
			let subscription = response.body.data.subscription;

			// Check Http Status
			expect(response.statusCode).to.equal(201);

			// Check for Properties
			checkUserPlan(subscription);

			// Check Data
			expect(subscription.active_plan).to.equal('basic');
			expect(subscription.future_plan).to.equal('');
			expect(subscription.end_date).to.equal(null);
		});

		it('should be successful and return proper data for [friendly] vouchers(casing and special chars)', async () => {
			let userData = generateUserData();
			userData.voucher = 'uSc   !@#$%  ^&*()-   001';
			let response = await createItem(path, userData, true);
			let subscription = response.body.data.subscription;

			// Check Http Status
			expect(response.statusCode).to.equal(201);

			// Check for Properties
			checkUserPlan(subscription);

			// Check Data - Should match USC001
			expect(subscription.active_plan).to.equal('scholar');
			expect(subscription.future_plan).to.equal('');
		});

		/*
    |--------------------------------------------------------------------------
    | Negative Tests
    |--------------------------------------------------------------------------
    */

		it('should return an error when using invalid voucher code', async () => {
			let userData = generateUserData();
			userData.voucher = makeUniqueString();
			options.body = userData;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a [UPGRADE] voucher reaches its usage_limit', async () => {
			// Note: The usage limit for UPGRADE vouchers are currently set to 10 in the code
			let upgradeVoucherUsageLimit = process.env.VOUCHER_DEFAULT_USAGE_LIMIT_LOCAL;

			for (let ctr = 0; ctr < upgradeVoucherUsageLimit; ctr++) {
				let voucherCode = Object.keys(upgradeVouchers[0])[0];

				// Create user1 which uses the voucherCode
				let user1Data = generateUserData();
				user1Data.voucher = voucherCode;
				let response = await createItem(path, user1Data, true);

				// Since the voucher limit is set to 10, the API should throw an error if a user tries to use the voucher
				if (ctr == upgradeVoucherUsageLimit - 1) {
					let user2Data = generateUserData();
					user2Data.voucher = voucherCode;
					options.body = user2Data;
					await checkStatusCodeByOptions(options, 400);
				}
			}
		});

		it('should return an error if a [REMOTE] voucher reaches its usage_limit', async () => {
			let remoteVoucherUsageLimit = process.env.VOUCHER_DEFAULT_USAGE_LIMIT_REMOTE;

			for (let ctr = 0; ctr < remoteVoucherUsageLimit; ctr++) {
				let voucherCode = Object.keys(remoteVouchers[0])[0];

				// Create user1 which uses the voucherCode
				let user1Data = generateUserData();
				user1Data.voucher = voucherCode;
				let response = await createItem(path, user1Data, true);

				// Since the voucher limit is set to 1, the API should throw an error if a user tries to use the voucher
				if (ctr == remoteVoucherUsageLimit - 1) {
					let user2Data = generateUserData();
					user2Data.voucher = voucherCode;
					options.body = user2Data;
					await checkStatusCodeByOptions(options, 400);
				}
			}
		});
	});
});
