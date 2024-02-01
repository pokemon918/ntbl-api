const expect = require('chai').expect;
const request = require('request-promise');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkCreateStatusCode,
	checkForSuccess,
	generateUserData,
	signPath,
	login,
} = require('../common.js');

describe('User', () => {
	describe('create', () => {
		let options,
			path,
			baseData,
			tastingPath,
			tastingResponse,
			user,
			userData,
			userB,
			userBData,
			replayData;

		before(async () => {
			options = {...basePostOptions};

			let createUserPath = baseUrl + '/user';

			// Create users
			user = generateUserData();
			userData = await createItem(createUserPath, user);

			userB = generateUserData();
			userBData = await createItem(createUserPath, userB);

			await login(user.email, user.rawPass);

			baseData = {name: 'Test Tasting'};
			tastingPath = signPath('/tasting', 'POST');
			tastingResponse = await createItem(tastingPath, baseData);

			replayData = tastingResponse.data;
			replayData['replay'] = JSON.stringify({user_ref: userData.data.ref});

			// todo : other user should be admin type
			await login(userB.email, userB.rawPass);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.url = signPath('/admin/replay/tasting', 'POST');
			options.body = {};
		});

		it('should be successful in replaying a [tasting] [POST] within a whitelisted [ip]', async () => {
			options.body = replayData;
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			expect(response.statusCode).to.equal(201);
			expect(response.body.data.name).to.equal(replayData.name);
		});

		// todo : should only be accessed by an admin user type

		// Negative Tests
		it('should not be successful in replaying a [tasting] [POST] with a missing [replay_user_ref]', async () => {
			await checkCreateStatusCode(options.url, options.body, 400);
		});
	});
});
