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
	sha256,
	md5,
	validMD5,
} = require('../common.js');

describe('User', () => {
	describe('get user by ref | handle | email', () => {
		let options, baseUserPath, getUserPath, user1, user1Data, user2, user2Data, checkUserInfo;

		before(async () => {
			options = {...baseGetOptions};
			baseUserPath = baseUrl + '/user';

			// Create user1
			user1 = generateUserData();
			user1.name = makeUniqueString();
			user1.handle = makeUniqueString();
			user1Data = await createItem(baseUserPath, user1);
			user1.ref = user1Data.data.ref;

			await login(user1.email, user1.rawPass);

			getUserPath = `${baseUserPath}/${user1Data.data.ref}`;

			checkUserInfo = (user, baseUser = null) => {
				// Check for property existence
				expect(user).to.not.have.property('id');
				expect(user).to.have.property('name');
				expect(user).to.have.property('handle');
				expect(user).to.have.property('gravatar');
				expect(user).to.have.property('ref');
				expect(user).to.have.property('salt');
				expect(user).to.have.property('iterations');

				// Check for correct data type for root payload fields
				expect(user.name).to.be.an('string');
				expect(user.handle).to.be.an('string');
				expect(validMD5(user.gravatar)).to.equal(true);
				expect(user.ref).to.be.an('string');
				expect(user.salt).to.be.an('string');
				expect(user.iterations).to.be.an('number');

				if (baseUser) {
					expect(baseUser.name).to.be.equal(user.name);
					expect(baseUser.handle).to.be.equal(user.handle);
					expect(baseUser.ref).to.be.equal(user.ref);
					expect(baseUser.iterations).to.be.equal(user.iterations);
					expect(md5(baseUser.email)).to.be.equal(user.gravatar);
				}
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath('/user/' + user1Data.data.ref);
		});

		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have proper data', async () => {
			let user = await request(options);
			checkUserInfo(user, user1);
		});

		it('should return proper data if user @handle is used', async () => {
			options.uri = signPath('/user/@' + user1.handle);
			let user = await request(options);
			checkUserInfo(user, user1);
		});

		// it('should return proper data if user email is used', async () => {
		// 	options.uri = `${baseUserPath}/${user1.email}`;
		// 	let user = await request(options);
		// 	checkUserInfo(user, user1);
		// });

		it('should return proper data for the currently logged in user if no handle, ref, or email is provided in the route', async () => {
			options.uri = signPath('/myinfo', 'GET');
			let user = await request(options);
			checkUserInfo(user, user1);
		});

		/* Negative test */

		it('should fail if ref does not exist', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			options.uri = signPath('/user/' + makeUniqueString());
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if handle does not exist', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			options.uri = signPath('/user/@' + makeUniqueString());
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if ref is not valid', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			options.uri = signPath('/user/!' + makeUniqueString());
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if handle is not valid', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			options.uri = signPath('/user/@!' + makeUniqueString());
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
