const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	makeUniqueString,
	login,
	signPath,
	generateUserData,
} = require('../common.js');

describe('User', () => {
	describe('Get Counts', () => {
		let options, baseUserPath, user, userData, totalImpressions, totalFeaturedEvents;

		before(async () => {
			options = {...basePostOptions};
			baseUserPath = baseUrl + '/user';

			// Create User and Logon
			user = generateUserData();
			user.name = makeUniqueString();
			user.handle = makeUniqueString();
			userData = await createItem(baseUserPath, user);
			user.ref = userData.data.ref;
			await login(user.email, user.rawPass);

			// Create a number of Tastings
			totalImpressions = [];
			for (let ctr = 1; ctr <= 3; ctr++) {
				options.body = {
					name: makeUniqueString(),
				};
				options.method = 'POST';
				options.uri = signPath('/tasting', 'POST');
				totalImpressions.push(await request(options));
			}
			totalImpressions = totalImpressions.length;

			// Get Current Featured Events
			options.method = 'GET';
			options.uri = signPath('/events/featured', 'GET');
			let featured = await request(options);
			totalFeaturedEvents = featured.events.length;
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath('/user/counts', 'GET');
		});

		it('should have proper data', async () => {
			let countsResponse = await request(options);
			expect(countsResponse.impressions).to.equal(totalImpressions);
			expect(countsResponse.featured_events).to.equal(totalFeaturedEvents);
		});
	});
});
