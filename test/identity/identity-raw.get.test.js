const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	createItem,
	checkStatusCodeByOptions,
	generateUserData,
	makeUniqueString,
	login,
	signPath,
} = require('../common.js');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
let user = {};

describe('Identity', () => {
	describe('get raw data by ref', () => {
		let options, path, getPath, createData, userResponse, createPath, checkRawIdentityData;

		before(async () => {
			options = {...baseGetOptions};

			// Generate user
			createPath = baseUrl + '/user';
			createData = generateUserData();
			createData.handle = makeUniqueString();

			// create a test tasting item first
			userResponse = await createItem(createPath, createData);
			path = baseUrl + '/raw/identity/';

			checkRawIdentityData = (user) => {
				// Check for property existence
				expect(user).to.have.property('id');
				expect(user).to.have.property('ref');
				expect(user).to.have.property('handle');
				expect(user).to.have.property('name');
				expect(user).to.have.property('email');
				expect(user).to.have.property('hpass');
				expect(user).to.have.property('salt');
				expect(user).to.have.property('iterations');
				expect(user).to.have.property('reset_token');
				expect(user).to.have.property('created_at');
				expect(user).to.have.property('updated_at');

				// Check for correct data type for root payload fields
				expect(user.id).to.be.an('number');
				expect(user.ref).to.be.an('string');
				expect(user.handle).to.equal(createData.handle);
				expect(user.name).to.be.an('string');
				expect(user.email).to.be.an('string');
				expect(user.hpass).to.be.an('string');
				expect(user.salt).to.be.an('string');
				expect(user.iterations).to.be.an('number');
				expect(user.reset_token).to.be.an('string');
				expect(user.created_at).to.be.an('string');
				expect(user.updated_at).to.be.an('string');
			};

			// Simulate login for user
			await login(createData.email, createData.rawPass);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath('/raw/identity/' + userResponse.data.ref, 'GET');
		});

		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have proper data', async () => {
			let user = await request(options);
			checkRawIdentityData(user);
		});

		it('should return proper data if ref has uppercase chars', async () => {
			let user = await request(options);
			checkRawIdentityData(user);
		});

		it('should return proper data if @handle is used instead of ref', async () => {
			let userByRef = await request(options);
			options.uri = signPath('/raw/identity/@' + userByRef.handle, 'GET');

			let userByHandle = await request(options);
			checkRawIdentityData(userByHandle);
		});

		it('should return error if ref has non-printable chars', async () => {
			options.uri = signPath('/raw/identity/' + userResponse.data.ref + '\t', 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if ref is empty', async () => {
			options.uri = signPath('/raw/identity/' + null, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error for non-existing ref', async () => {
			options.uri = signPath('/raw/identity/' + makeUniqueString(), 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error for invalid ref', async () => {
			options.uri = signPath('/raw/identity/' + '$(1n^v!4-l1dr3f', 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error for non-existing handle', async () => {
			options.uri = signPath('/raw/identity/@' + makeUniqueString(), 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error for invalid handle', async () => {
			// options.uri = path + '@#$(&(invalidR3F3';
			options.uri = signPath('/raw/identity/@!' + makeUniqueString(), 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
