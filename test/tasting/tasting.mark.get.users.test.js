const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	makeUniqueString,
	generateUserData,
	login,
	signPath,
} = require('../common.js');

describe('Tasting', () => {
	describe('Get Marked List', () => {
		let options, tasting, user, userData, anotherUser, anotherUserData, users;

		before(async () => {
			users = [];

			// Create User
			let createUserPath = baseUrl + '/user';
			user = generateUserData();
			userData = await createItem(createUserPath, user);
			users.push(userData.data.ref);

			// Create Another User
			anotherUser = generateUserData();
			anotherUserData = await createItem(createUserPath, anotherUser);
			users.push(anotherUserData.data.ref);

			// Simulate Login
			await login(user.email, user.rawPass);

			// Create Tasting
			options = {...basePostOptions};
			options.body = {name: 'test_name'};

			options.uri = signPath('/tasting', 'POST');
			tasting = await request(options);

			// Mark Tasting , Owner
			await markTasting(tasting.data.ref);

			// Mark Tasting , Other User
			await login(anotherUser.email, anotherUser.rawPass);
			await markTasting(tasting.data.ref);

			// Simulate Re-Login to Owner
			await login(user.email, user.rawPass);
		});

		const markTasting = async (tastingRef) => {
			options.uri = signPath('/tasting/' + tastingRef + '/mark', 'POST');
			await request(options);
		};

		beforeEach(async () => {
			options.transform = null;
			options.body = null;
			options.uri = signPath('/tasting/' + tasting.data.ref + '/marked-by');
			options.method = 'GET';
		});

		const checkMarkedListData = (response) => {
			expect(response.users.length).to.equal(users.length);
			expect(response.total).to.equal(users.length);

			for (let i = 0; i <= response.length - 1; i++) {
				expect(users.includes(response.users[i])).to.equal(true);
			}
		};

		// Positive Tests
		it('should be successful', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data', async () => {
			let response = await request(options);
			checkMarkedListData(response);
		});

		it('should return proper data for other users', async () => {
			await login(anotherUser.email, anotherUser.rawPass);
			options.uri = signPath('/tasting/' + tasting.data.ref + '/marked-by');
			let response = await request(options);
			checkMarkedListData(response);
		});
	});
});
