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

const throttleLimit = process.env.THROTTLE_LIMIT;
const throttleDisabled =
	process.env.THROTTLE_DISABLE === undefined ||
	process.env.THROTTLE_DISABLE.toLowerCase() === 'true';

describe('Who', function () {
	this.timeout(320000);
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

	it(
		'should return an error if the same user tries to make a request more than the allowed limit of ' +
			throttleLimit,
		async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			for (let i = 0; i < throttleLimit; i++) {
				options.uri = signPath('/tastings', 'GET');
				await checkStatusCodeByOptions(options, 200);
			}

			// Actual whitelisted status is via ip and other factors , the env variable is for syncing this test
			if (throttleDisabled !== true) {
				options.uri = signPath('/tastings', 'GET');
				await checkStatusCodeByOptions(options, 429);
			}
		}
	);
});
