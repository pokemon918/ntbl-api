const expect = require('chai').expect;
const request = require('request-promise');

const {
	baseUrl,
	basePostOptions,
	generateUserData,
	makeUniqueString,
	makeRandomInt,
	login,
	signPath,
	createItem,
	checkStatusCodeByOptions,
	checkVoucherData,
} = require('../common.js');

describe('Subscription', () => {
	let options, baseUserPath, user, userData, generateVouchers, voucherTrack;

	before(async () => {
		voucherTrack = [];
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

		generateVouchers = (count = 5) => {
			let vouchers = [];
			for (let i = 0; i < count; i++) {
				let code = makeUniqueString(10, true).toUpperCase();
				let valid_days = makeRandomInt(1, 999);

				while (voucherTrack.includes(code, true)) {
					code = makeUniqueString(10, true).toUpperCase();
					break;
				}

				vouchers.push({
					code: code,
					valid_days: valid_days,
				});

				voucherTrack.push(code);
			}
			return vouchers;
		};
	});

	describe('Vouchers Add', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath('/admin/subscription/vouchers', 'POST');
			options.body = {
				plan: 'basic',
				vouchers: generateVouchers(),
			};
		});

		/* Positive tests */
		it('Should be successful', async () => {
			await checkStatusCodeByOptions(options, 201);
		});

		it('Should return proper data', async () => {
			let vouchers = generateVouchers();
			let voucherCodes = vouchers.map((voucher) => voucher.code);
			options.body.vouchers = vouchers;
			let response = await request(options);
			let createdVouchers = response.data.vouchers;

			for (let i = 0; i < createdVouchers.length; i++) {
				let createdVoucher = createdVouchers[i];
				checkVoucherData(createdVoucher);
				expect(voucherCodes.includes(createdVoucher.code)).to.be.true;
			}
		});

		it('Should be successful if a voucher is in all uppercase chars', async () => {
			let vouchers = generateVouchers();
			vouchers.map((voucher) => voucher.code.toUpperCase());
			options.body.vouchers = vouchers;
			await checkStatusCodeByOptions(options, 201);
		});

		it('Should be successful for all valid paid plans', async () => {
			let paidPlans = ['basic', 'pro', 'scholar'];
			for (let i = 0; i < paidPlans.length; i++) {
				let vouchers = generateVouchers();
				options.uri = signPath('/admin/subscription/vouchers', 'POST');
				options.body = {
					plan: paidPlans[i],
					vouchers: vouchers,
				};
				await checkStatusCodeByOptions(options, 201);
			}
		});

		it('Should be successful if the voucher has infinite parameters', async () => {
			let vouchers = generateVouchers();
			vouchers.map((voucher) => (voucher.valid_days = -1));
			vouchers.map((voucher) => (voucher.usage_limit = -1));
			options.body.vouchers = vouchers;
			await checkStatusCodeByOptions(options, 201);
		});

		/*
		|--------------------------------------------------------------------------
		| Negative Tests
		|--------------------------------------------------------------------------
		*/

		it('Should return an error if plan does not exist in the payload', async () => {
			options.body = {
				vouchers: generateVouchers(),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if plan is null', async () => {
			options.body = {
				plan: null,
				vouchers: generateVouchers(),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if plan is an empty string', async () => {
			options.body = {
				plan: '',
				vouchers: generateVouchers(),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if plan does not exist or is not a valid paid plan', async () => {
			options.body = {
				plan: makeUniqueString(),
				vouchers: generateVouchers(),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if vouchers are empty', async () => {
			options.body = {
				plan: 'basic',
				vouchers: [],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if a voucher [code] is numeric', async () => {
			let vouchers = generateVouchers();
			vouchers.map((voucher) => (voucher.code = makeRandomInt()));

			options.body = {
				plan: 'basic',
				vouchers: vouchers,
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if a voucher [code] exceeds the max limit of 20 chars', async () => {
			let vouchers = generateVouchers();
			vouchers.map((voucher) => (voucher.code = makeUniqueString(21)));

			options.body = {
				plan: 'basic',
				vouchers: vouchers,
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if a voucher [*] is an array', async () => {
			let vouchers = generateVouchers();
			let offendingValue = [];
			vouchers.map((voucher) => (voucher.code = offendingValue));
			vouchers.map((voucher) => (voucher.plan = offendingValue));
			vouchers.map((voucher) => (voucher.valid_days = offendingValue));
			vouchers.map((voucher) => (voucher.usage_limit = offendingValue));

			options.body = {
				plan: 'basic',
				vouchers: vouchers,
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if a voucher [*] is an object', async () => {
			let vouchers = generateVouchers();
			let offendingValue = {};
			vouchers.map((voucher) => (voucher.code = offendingValue));
			vouchers.map((voucher) => (voucher.plan = offendingValue));
			vouchers.map((voucher) => (voucher.valid_days = offendingValue));
			vouchers.map((voucher) => (voucher.usage_limit = offendingValue));

			options.body = {
				plan: 'basic',
				vouchers: vouchers,
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if a voucher [*] has invalid chars', async () => {
			let vouchers = generateVouchers();
			let offendingValue = '!@#!@!%#!@(*^^%(#';
			vouchers.map((voucher) => (voucher.code = offendingValue));
			vouchers.map((voucher) => (voucher.plan = offendingValue));
			vouchers.map((voucher) => (voucher.valid_days = offendingValue));
			vouchers.map((voucher) => (voucher.usage_limit = offendingValue));

			options.body = {
				plan: 'basic',
				vouchers: vouchers,
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if a voucher has invalid [valid_days]', async () => {
			let vouchers = generateVouchers();
			vouchers.map((voucher) => (voucher.valid_days = -2));
			options.body.vouchers = vouchers;
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if a voucher [valid_days] exceeds the maximum allowed value (999)', async () => {
			let vouchers = generateVouchers();
			vouchers.map((voucher) => (voucher.valid_days = 1000));
			options.body.vouchers = vouchers;
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should return an error if a voucher has invalid [usage_limit]', async () => {
			let vouchers = generateVouchers();
			vouchers.map((voucher) => (voucher.usage_limit = -2));
			options.body.vouchers = vouchers;
			await checkStatusCodeByOptions(options, 400);
		});

		it('Should  return an error if a voucher has special characters', async () => {
			let vouchers = generateVouchers();
			vouchers.map(
				(voucher) => (voucher.code = '_!@#' + makeUniqueString(7).toUpperCase() + '#@!_')
			);
			options.body.vouchers = vouchers;
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
