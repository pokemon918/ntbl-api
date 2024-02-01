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
} = require('../common.js');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
let user = {};

const generateUserData = () => {
	user.email = 'email_' + makeUniqueString() + '@ntbl-api.com';
	user.rawPass = '1q1q';
	return getAuthCreationPayload(user.rawPass, user.email);
};

describe('User', () => {
	describe('get user specs', () => {
		let options, path, getPath, createData, userResponse, createPath, checkUserSpecsData;

		before(async () => {
			options = {...baseGetOptions};
			createPath = baseUrl + '/user';
			createData = generateUserData();

			// create a test tasting item first
			userResponse = await createItem(createPath, createData);
			path = baseUrl + '/user';
			getPath = path + '/?email=' + createData.email;

			checkUserSpecsData = (user) => {
				// Check for property existence
				expect(user).to.not.have.property('id');
				expect(user).to.have.property('ref');
				expect(user).to.have.property('salt');
				expect(user).to.have.property('iterations');

				// Check for correct data type for root payload fields
				expect(user.ref).to.be.an('string');
				expect(user.salt).to.be.an('string');
				expect(user.iterations).to.be.an('number');
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = getPath;
		});

		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have proper data', async () => {
			options.uri = getPath;
			let user = await request(options);
			checkUserSpecsData(user);
		});

		it('should be still return proper data if ref has uppercase chars', async () => {
			options.uri = getPath;
			let user = await request(options);
			checkUserSpecsData(user);
		});

		it('should return error if email does not have a valid format', async () => {
			options.uri = path + '/?email=invalid.com';
			await checkStatusCodeByOptions(options, 401);
		});

		it('should return error if email is empty ', async () => {
			options.uri = path + '/?email=';
			await checkStatusCodeByOptions(options, 401);
		});

		it('should return error if email is null', async () => {
			options.uri = path + '/?email=' + null;
			await checkStatusCodeByOptions(options, 401);
		});

		it('should return error if email does not exists', async () => {
			options.uri = path + '/?email=a_random_and_non-existing_email@test.com';
			await checkStatusCodeByOptions(options, 401);
		});
	});
});
