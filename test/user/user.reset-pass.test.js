const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	checkStatusCodeByOptions,
	checkForSuccess,
	createItem,
	makeUniqueString,
	signPath,
	login,
	generateUserData,
} = require('../common.js');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
let user = {};

const generateNewHpass = (rawPass = '') => {
	if (rawPass) user.rawPass = rawPass;
	return getAuthCreationPayload(rawPass);
};

// Begin testing
describe('User', () => {
	const resetPassPath = '/user/access/reset';
	let options,
		requestResetPayload,
		useResetTokenPayload,
		_resetToken,
		hpass,
		rPass,
		lPass,
		baseUserPath,
		user,
		userData;

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

		requestResetPayload = {
			email: user.email,
			client_host: 'http://localhost:3000',
		};
	});

	beforeEach(async () => {
		// reset required options
		options.transform = null;
		options.method = 'POST';
		options.uri = baseUrl + resetPassPath;
	});

	describe('Request For Password Reset', () => {
		before(async () => {
			options.body = requestResetPayload;
		});

		/* Positive Tests */
		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			let response = await request(options);
			expect(response.statusCode).to.equal(200);
		});

		it('should be successful', async () => {
			let response = await request(options);
			checkForSuccess(response);
		});

		it('should return proper data', async () => {
			let response = await request(options);

			// Property Existence
			expect(response.data).to.have.property('userRef');
			expect(response.data).to.have.property('salt');
			expect(response.data).to.have.property('iterations');
			expect(response.data).to.have.property('resetToken');

			// Property Type
			expect(response.data.userRef).to.be.a('string');
			expect(response.data.salt).to.be.a('string');
			expect(response.data.iterations).to.be.a('number');
			expect(response.data.resetToken).to.be.a('string');

			// Data
			expect(response.status).to.equal('success');
			expect(response.message.length).to.be.above(0);
			expect(response.data.userRef).to.equal(user.ref);
			expect(response.data.salt.length).to.above(0);
			expect(response.data.iterations).to.above(0);
			expect(response.data.resetToken.length).to.above(0);
		});

		it('should generate a reset token', async () => {
			// Request for a password reset
			let response = await request(options);
			let token = response.data.resetToken;

			// Get raw dev user data
			options.method = 'GET';
			options.uri = signPath('/raw/identity/' + userData.data.ref);
			let user = await request(options);
			expect(token).to.equal(user.reset_token);
		});

		it('should accept noteable.co as client_host', async () => {
			options.body.client_host = 'https://noteable.co';
			let response = await request(options);
			checkForSuccess(response);
		});

		it('should accept *.ntbl.link as client_host', async () => {
			options.body.client_host = 'http://abc-def.z123.ntbl.link';
			let response = await request(options);
			checkForSuccess(response);
		});

		it('should accept localhost and port as client_host', async () => {
			options.body.client_host = 'http://localhost:3000';
			let response = await request(options);
			checkForSuccess(response);
		});

		it('should accept 127.0.0.1 as client_host', async () => {
			options.body.client_host = 'http://127.0.0.1';
			let response = await request(options);
			checkForSuccess(response);
		});

		/* Negative Tests */
		it('should fail if payload is empty', async () => {
			// init payload
			options.body = null;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if email is invalid', async () => {
			// init payload
			let data = {
				email: 'invalidemail',
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if payload includes resetToken', async () => {
			// init payload
			let data = {
				email: user.email,
				resetToken: '2939672214db6e6555ed29901f994c18416f0c52e750fdee5400192d120e358f',
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not a valid string [int]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: 123,
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not a valid string [array]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: [],
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not a valid string [object]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: {},
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not a valid string [float]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: 3.5,
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not a valid URL [only protocol]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: 'http:',
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not a valid URL [only host]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: 'localhost:3000',
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not a valid URL [invalid protocol]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: 'httpasdlfjaskl://localhost:3000',
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host has exceed the max chars of 64', async () => {
			let hostWithMaxChars = 'a'.repeat(65);

			// init payload
			let data = {
				email: user.email,
				client_host: 'http://' + hostWithMaxChars,
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not one of the accepted host [ntbl.co]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: 'http://ntbl.co',
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not one of the accepted host [noteable.link]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: 'http://noteable.link',
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not one of the accepted host [localhostz]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: 'http://localhostz',
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not one of the accepted host [127.0.0.2]', async () => {
			// init payload
			let data = {
				email: user.email,
				client_host: 'http://127.0.0.2',
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if client_host is not one of the accepted host [randomHost]', async () => {
			let randomHost = makeUniqueString();

			// init payload
			let data = {
				email: user.email,
				client_host: 'http://' + randomHost,
			};

			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});
	});

	describe('Consume Password Reset Token', () => {
		beforeEach(async () => {
			// Request for reset password before each test
			options.body = requestResetPayload;
			let response = await request(options);
			rPass = makeUniqueString();
			hpass = generateNewHpass(rPass);
			_resetToken = response.data.resetToken;

			// Build payload for reset token consumption
			useResetTokenPayload = {
				resetToken: _resetToken,
				hpass: hpass.hpass,
				iterations: hpass.iterations,
			};

			// After successfully requesting for a password reset, use the reset token for all succeeding tests.
			options.body = useResetTokenPayload;
		});

		/* Positive Tests */
		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			let response = await request(options);
			expect(response.statusCode).to.equal(200);
			lPass = rPass;
		});

		it('should be successful', async () => {
			let response = await request(options);
			checkForSuccess(response);
			lPass = rPass;
		});

		it('should update the current password', async () => {
			// Get user data before requesting for a password reset
			await login(user.email, lPass);
			options.method = 'GET';
			options.uri = signPath('/raw/identity/' + userData.data.ref);
			let userInitData = await request(options);

			// Consume the reset_token and update the password
			options.method = 'POST';
			options.body = useResetTokenPayload;
			options.uri = baseUrl + resetPassPath;
			let response = await request(options);

			// Get user data after password change
			await login(user.email, rPass);
			options.method = 'GET';
			options.uri = signPath('/raw/identity/' + userData.data.ref);
			let userAfterPassChangeData = await request(options);

			// Make sure that the password has been updated
			expect(userInitData.iterations).to.not.equal(userAfterPassChangeData.iterations);
			expect(userInitData.salt).to.not.equal(userAfterPassChangeData.salt);
			expect(userInitData.hpass).to.not.equal(userAfterPassChangeData.hpass);
			lPass = rPass;
		});

		it('should invalidate the resetToken after one-time use', async () => {
			// Request for a password reset
			options.uri = baseUrl + resetPassPath;
			let response = await request(options);
			checkForSuccess(response);

			// Get raw dev user data
			await login(user.email, rPass);
			options.method = 'GET';
			options.uri = signPath('/raw/identity/' + userData.data.ref);
			let userAfter = await request(options);

			expect(userAfter.reset_token).to.equal('');
			expect(userAfter.reset_token).to.not.equal(useResetTokenPayload.resetToken);
			lPass = rPass;
		});

		/* Negative Tests */
		it('should fail if payload is empty', async () => {
			// init payload
			options.body = null;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if resetToken is empty', async () => {
			// init payload
			let data = {
				resetToken: '',
				hpass: hpass.hpass,
				iterations: hpass.iterations,
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if resetToken is missing in the payload', async () => {
			// init payload
			let data = {
				hpass: hpass.hpass,
				iterations: hpass.iterations,
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if resetToken is invalid', async () => {
			// init payload
			let data = {
				resetToken: 'invalidResetToken',
				hpass: hpass.hpass,
				iterations: hpass.iterations,
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if hpass is empty', async () => {
			// init payload
			let data = {
				resetToken: _resetToken,
				hpass: '',
				iterations: hpass.iterations,
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if hpass is missing in the payload', async () => {
			// init payload
			let data = {
				resetToken: _resetToken,
				iterations: hpass.iterations,
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if hpass is invalid', async () => {
			// init payload
			let data = {
				resetToken: _resetToken,
				hpass: 'invalidhpass',
				iterations: hpass.iterations,
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if iterations is empty', async () => {
			// init payload
			let data = {
				resetToken: _resetToken,
				hpass: hpass.hpass,
				iterations: '',
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if iterations is missing in the payload', async () => {
			// init payload
			let data = {
				resetToken: _resetToken,
				hpass: hpass.hpass,
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if iterations is invalid', async () => {
			// init payload
			let data = {
				resetToken: _resetToken,
				hpass: hpass.hpass,
				iterations: 'invaliditerations',
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if email is missing', async () => {
			// init payload
			let data = {
				email: 'dev1@ntbl-api.com',
				resetToken: _resetToken,
			};
			options.body = data;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if the resetToken is used more than once', async () => {
			// Request for a password reset the first time
			await checkStatusCodeByOptions(options, 200);

			// Request for a password reset the the second time
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
