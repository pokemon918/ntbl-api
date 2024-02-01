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
	describe('Signup Force Scholar', () => {
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
						code: makeUniqueString(20).toUpperCase(),
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
						code: makeUniqueString(10).toUpperCase(),
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

		// env var is detected and parsed as string
		if (process.env.SIGNUP_FORCE_SCHOLAR == true) {
			it('should be successful and OVERRIDE [UPGRADE] vouchers', async () => {
				for (let ctr = 0; ctr <= upgradeVouchers.length - 1; ctr++) {
					let voucherCode = Object.keys(upgradeVouchers[ctr])[0];
					let subscriptionPlan = upgradeVouchers[ctr][voucherCode];
					let userData = generateUserData();
					userData.voucher = voucherCode;
					let response = await createItem(path, userData, true);
					let subscription = response.body.data.subscription;

					// Check Http Status
					expect(response.statusCode).to.equal(201);

					//Check Data
					expect(subscription.active_plan).to.equal('scholar');
					expect(subscription.future_plan).to.equal('');
					expect(subscription.status).to.equal('active');
				}
			});

			it('should be successful and OVERRIDE [REMOTE] vouchers', async () => {
				for (let ctr = 0; ctr <= remoteVouchers.length - 1; ctr++) {
					let voucherCode = Object.keys(remoteVouchers[ctr])[0];
					let subscriptionPlan = remoteVouchers[ctr][voucherCode];
					let userData = generateUserData();
					userData.voucher = voucherCode;
					let response = await createItem(path, userData, true);
					let subscription = response.body.data.subscription;

					// Check Http Status
					expect(response.statusCode).to.equal(201);

					//Check Data
					expect(subscription.active_plan).to.equal('scholar');
					expect(subscription.future_plan).to.equal('');
					expect(subscription.status).to.equal('active');
				}
			});

			it('should be successful and OVERRIDE [REMOTE] vouchers', async () => {
				for (let ctr = 0; ctr <= devVouchers.length - 1; ctr++) {
					let voucherCode = Object.keys(devVouchers[ctr])[0];
					let subscriptionPlan = devVouchers[ctr][voucherCode];
					let userData = generateUserData();
					userData.voucher = voucherCode;
					let response = await createItem(path, userData, true);
					let subscription = response.body.data.subscription;

					// Check Http Status
					expect(response.statusCode).to.equal(201);

					//Check Data
					expect(subscription.active_plan).to.equal('scholar');
					expect(subscription.future_plan).to.equal('');
					expect(subscription.status).to.equal('active');
				}
			});
		} else {
			console.log(
				'\x1b[35m%s\x1b[0m',
				'SIGNUP_FORCE_SCHOLAR must be enabled in the .env file in order to run the tests on this file.'
			);
		} //end of process.env.SIGNUP_FORCE_SCHOLAR check
	});
});
