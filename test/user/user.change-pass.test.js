const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	makeUniqueString,
	signPath,
	login,
	createUser,
} = require('../common.js');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');

let user = {};
let minIterations = 15000;
let maxIterations = 50000;

// Test functions
const generateUserData = () => {
	user.email = 'email_' + makeUniqueString() + '@ntbl-api.com';
	user.rawPass = '1q1q';
	return getAuthCreationPayload(user.rawPass, user.email);
};

const generateNewHpass = (rawPass = '') => {
	if (rawPass) user.rawPass = rawPass;
	return getAuthCreationPayload(rawPass);
};

// Begin testing
describe('User', () => {
	describe('Change Password', () => {
		const changePassPath = '/user/access';
		const changePassMethod = 'POST';
		let options, userRef;

		before(async () => {
			options = {...basePostOptions};
			// Create a new user for testing
			let response = await createUser(generateUserData());
			userRef = response.data.ref;
		});

		beforeEach(async () => {
			// Re-evaluate signature before each test (since password is changed in each and every test)
			await login(user.email, user.rawPass);

			// reset required options
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath(changePassPath, changePassMethod);
		});

		/* Positive Tests */

		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			options.body = generateNewHpass(makeUniqueString());
			let response = await request(options);
			expect(response.statusCode).to.equal(200);
		});

		it('should be successful', async () => {
			options.body = generateNewHpass(makeUniqueString());
			let response = await request(options);
			checkForSuccess(response);
		});

		it('should change the current password', async () => {
			// Get user data before password change
			options.method = 'GET';
			options.uri = signPath('/raw/identity/' + userRef);
			let userInitData = await request(options);

			// Change user's password
			let newRawPass = makeUniqueString();
			options.method = 'POST';
			options.body = generateNewHpass(newRawPass);
			options.uri = signPath(changePassPath, changePassMethod);
			await request(options);

			// Get user data after password change
			await login(user.email, newRawPass);
			options.method = 'GET';
			options.uri = signPath('/raw/identity/' + userRef);
			let userAfterPassChangeData = await request(options);

			// Make sure that were still comparing the data of the exact same user
			expect(userInitData.id).to.equal(userAfterPassChangeData.id);
			expect(userInitData.ref).to.equal(userAfterPassChangeData.ref);
			expect(userInitData.handle).to.equal(userAfterPassChangeData.handle);
			expect(userInitData.name).to.equal(userAfterPassChangeData.name);
			expect(userInitData.email).to.equal(userAfterPassChangeData.email);

			// Make sure that the password and all user specs has been changed
			expect(userInitData.iterations).to.not.equal(userAfterPassChangeData.iterations);
			expect(userInitData.salt).to.not.equal(userAfterPassChangeData.salt);
			expect(userInitData.hpass).to.not.equal(userAfterPassChangeData.hpass);
		});

		/* Negative Tests */
		it('should fail if payload is empty', async () => {
			// init payload
			options.body = null;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if signature is invalid', async () => {
			// init payload
			options.uri = baseUrl + changePassPath + '?who=invalidsignature';
			await checkStatusCodeByOptions(options, 401);
		});

		it('should fail if hpass is missing in payload', async () => {
			// init payload
			let data = generateNewHpass();
			delete data.hpass;
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if iterations is missing in payload', async () => {
			// init payload
			let data = generateNewHpass();
			delete data.iterations;
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if hpass is null or empty in payload', async () => {
			// init payload
			let data = generateNewHpass();
			data.hpass = '';
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if iterations is null or empty in payload', async () => {
			// init payload
			let data = generateNewHpass();
			data.iterations = '';
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if hpass is invalid', async () => {
			// init payload
			let data = generateNewHpass();
			data.hpass = 'thisisaninvalidhpass';
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if iterations is not numeric', async () => {
			// init payload
			let data = generateNewHpass();
			data.iterations = 'iteration';
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if iterations is less than ' + minIterations, async () => {
			// init payload
			let data = generateNewHpass();
			data.iterations = minIterations - 1;
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if iterations is more than ' + maxIterations, async () => {
			// init payload
			let data = generateNewHpass();
			data.iterations = maxIterations + 1;
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
