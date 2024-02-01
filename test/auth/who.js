const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	createItem,
	checkStatusCodeByOptions,
	generateUserData,
	login,
	signPath,
	makeUniqueString,
} = require('../common.js');

describe('Who', () => {
	let options, path, user, userData, extractWho, who;

	extractWho = (url) => {
		let urlObj = new URL(url);
		return urlObj.searchParams.get('who');
	};

	before(async () => {
		options = {...baseGetOptions};

		// Login a test user
		user = generateUserData();
		userData = await createItem(baseUrl + '/user', user, true);
		await login(user.email, user.rawPass);
	});

	beforeEach(async () => {
		options.transform = null;
		options.method = 'GET';
		options.uri = signPath('/tastings', 'GET');
	});

	it('should return correct status code if [$who] is valid and used for the first time', async () => {
		options.transform = (body, response, resolveWithFullResponse) => {
			return response;
		};
		await checkStatusCodeByOptions(options, 200);
	});

	it('should return an if [$who] is used more than once', async () => {
		// Use $who for the first time, should succeed
		options.transform = (body, response, resolveWithFullResponse) => {
			return response;
		};
		await checkStatusCodeByOptions(options, 200);

		// Use $who for the second time, should fail
		let who = extractWho(options.uri);
		options.uri = baseUrl + '/tastings?who=' + who;
		await checkStatusCodeByOptions(options, 412);
	});

	it('should return an if [$who] is invalid', async () => {
		let who = makeUniqueString(64);
		options.uri = baseUrl + '/tastings?who=' + who;
		await checkStatusCodeByOptions(options, 401);
	});
});
