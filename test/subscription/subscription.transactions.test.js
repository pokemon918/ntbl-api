const chai = require('chai');
const expect = chai.expect;
const request = require('request-promise');

const {
	baseUrl,
	baseGetOptions,
	basePostOptions,
	checkStatusCodeByOptions,
	createItem,
	login,
	signPath,
	makeUniqueString,
	generateUserData,
} = require('../common.js');

describe('Subscription', () => {
	let options, baseUserPath, user, userData;

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
	});

	describe('Transactions', () => {
		beforeEach(async () => {
			options.method = 'GET';
			options.uri = signPath('/admin/subscription/transactions', 'GET');
		});

		/* Positive tests */
		it('should list all transactions', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});
	});
});
