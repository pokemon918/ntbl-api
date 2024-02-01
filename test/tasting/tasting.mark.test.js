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
	describe('Mark', () => {
		let options, tasting, user, userData, anotherUser, anotherUserData;

		before(async () => {
			// Create User
			let createUserPath = baseUrl + '/user';
			user = generateUserData();
			userData = await createItem(createUserPath, user);

			// Create Another User
			anotherUser = generateUserData();
			anotherUserData = await createItem(createUserPath, anotherUser);

			// Simulate Login
			await login(user.email, user.rawPass);

			// Create Tasting
			options = {...basePostOptions};
			options.uri = signPath('/tasting', 'POST');
			options.body = {name: 'test_name'};
			tasting = await request(options);
		});

		const checkMarkedData = (response) => {
			checkForSuccess(response);
			expect(response.data).to.have.property('impression_ref');
			expect(response.data.impression_ref).to.be.a('string');
			expect(response.data.impression_ref).to.equal(tasting.data.ref);
		};

		beforeEach(async () => {
			options.transform = null;
			options.body = null;
			options.uri = signPath('/tasting/' + tasting.data.ref + '/mark', 'POST');
			options.method = 'POST';
		});

		// Positive Tests
		it('should be successful and return proper data (owner)', async () => {
			let response = await request(options);
			checkMarkedData(response);
		});

		it('should be successful and return proper data (other users)', async () => {
			await login(anotherUser.email, anotherUser.rawPass);
			options.uri = signPath('/tasting/' + tasting.data.ref + '/mark', 'POST');
			let response = await request(options);
			checkMarkedData(response);
		});

		// Negative Tests
		it('should return an error for already marked impressions', async () => {
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error for non existing impression ref', async () => {
			options.uri = signPath('/tasting/' + makeUniqueString() + '/mark', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error for invalid impression ref', async () => {
			options.uri = signPath('/tasting/!@$' + makeUniqueString() + '@$!/mark', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
