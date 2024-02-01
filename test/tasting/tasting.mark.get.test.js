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
		let options, tastings, user, userData, anotherUser, anotherUserData;

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

			// Create Tastings
			options = {...basePostOptions};
			options.body = {name: 'test_name'};
			tastings = [];

			for (let i = 0; i <= 2; i++) {
				options.uri = signPath('/tasting', 'POST');
				let tasting = await request(options);
				tastings.push(tasting.data.ref);
			}

			// Mark Tastings
			for (let i = 0; i <= tastings.length - 1; i++) {
				await markTasting(tastings[i]);
			}
		});

		const markTasting = async (tastingRef) => {
			options.uri = signPath('/tasting/' + tastingRef + '/mark', 'POST');
			await request(options);
		};

		beforeEach(async () => {
			options.transform = null;
			options.body = null;
			options.uri = signPath('/tastings/marked');
			options.method = 'GET';
		});

		const checkMarkedListData = (response) => {
			expect(response.length).to.equal(tastings.length);
			for (let i = 0; i <= response.length - 1; i++) {
				expect(tastings.includes(response[i])).to.equal(true);
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
			options.uri = signPath('/tastings/marked');
			let response = await request(options);
			expect(response.length).to.not.equal(tastings.length);
		});
	});
});
