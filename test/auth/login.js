const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	createItem,
	checkStatusCodeByOptions,
	makeUniqueString,
	login,
	signPath,
	generateUserData,
	getUserSpecs,
} = require('../common.js');

describe('User', () => {
	describe('Login', () => {
		let options, baseUserPath, user1, user1Data, checkUserInfo;

		before(async () => {
			options = {...baseGetOptions};
			baseUserPath = baseUrl + '/user';

			// Create user1
			user1 = generateUserData();
			user1.name = makeUniqueString();
			user1.handle = makeUniqueString();
			user1Data = await createItem(baseUserPath, user1);
			user1.ref = user1Data.data.ref;
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
		});

		/* Postive tests */

		it('should be able to successfully login with an [existing] account [valid] credentials', async () => {
			await login(user1.email, user1.rawPass);
			options.uri = signPath('/user/' + user1Data.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 200);
		});

		/* Negative tests */

		it('should fail to login with an [existing] account with [invalid] credentials', async () => {
			await login(user1.email, makeUniqueString());

			options.uri = signPath('/user/' + user1Data.data.ref, 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let error = null;
			await request(options)
				.then(() => {})
				.catch((err) => {
					error = err.error;
				})
				.finally(() => {
					expect(error.statusCode).to.equal(400);
					expect(error.error.code).to.equal('invalid_credentials');
				});
		});

		it('should fail to login with an [non-existing] account', async () => {
			let userSpecs = await getUserSpecs('email_' + makeUniqueString() + '@ntbl-api.com');
			expect(userSpecs.statusCode).to.equal(401);
			expect(userSpecs.error.error.code).to.equal('user_does_not_exist');
		});
	});
});
