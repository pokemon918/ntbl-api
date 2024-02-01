const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	checkCreateStatusCode,
	login,
	signPath,
} = require('../common.js');

describe('Event', () => {
	let options,
		user1,
		user1Data,
		user2,
		user2Data,
		createEventPath,
		baseEventData,
		checkProperData,
		wines,
		winesData,
		eventResponse,
		eventRef;

	before(async () => {
		options = {...basePostOptions};
		checkProperData = (event) => {
			// Check for property existence
			expect(event).to.not.have.property('id');
			expect(event).to.have.property('eventRef');
			expect(event).to.have.property('userRef');
			expect(event).to.have.property('deletedWines');

			// Check for correct data type
			expect(event.eventRef).to.be.a('string');
			expect(event.userRef).to.be.a('string');
			expect(event.deletedWines).to.be.an('array');
		};

		/****** Create users *******/
		let createUserPath = baseUrl + '/user';

		// Create users
		user1 = generateUserData();
		user1Data = await createItem(createUserPath, user1);

		user2 = generateUserData();
		user2Data = await createItem(createUserPath, user2);

		// Simulate login for user1
		await login(user1.email, user1.rawPass);

		// Create wines for user1
		winesData = [
			{
				name: makeUniqueString(),
				producer: makeUniqueString(),
				country: makeUniqueString(),
				region: makeUniqueString(),
				vintage: makeUniqueString(),
				grape: makeUniqueString(),
				price: '100',
				currency: 'USD',
			},
			{
				name: makeUniqueString(),
				producer: makeUniqueString(),
				country: makeUniqueString(),
				region: makeUniqueString(),
				vintage: makeUniqueString(),
				grape: makeUniqueString(),
				price: '100',
				currency: 'USD',
			},
		];

		wines = [];
		let wineRefs = [];

		// Create wines
		for (let data of winesData) {
			let tastingResponse = await createItem(signPath('/tasting', 'POST'), data);
			let wine = tastingResponse.data;
			wines.push(wine);
			wineRefs.push(wine.ref);
		}

		baseEventData = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'private',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
			wine_refs: wineRefs,
		};

		// Create
		eventResponse = await createItem(signPath('/event', 'POST'), baseEventData);
		eventRef = eventResponse.data.ref;
	});

	describe('Delete Wines', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath('/event/' + eventRef + '/tastings', 'POST');
			options.body = baseEventData;
		});

		/* Positive tests */
		it('should return correct status code', async () => {
			await checkStatusCodeByOptions(options, 202);
		});

		it('should return proper data for events', async () => {
			let event = await request(options);
			checkProperData(event.data);
		});

		/* Negative Tests */

		it('should return an error if payload is empty', async () => {
			options.body = {};
			options.uri = signPath('/event/' + eventRef + '/tastings', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error when editing/updating events that dont belong to the current user', async () => {
			await login(user2.email, user2.rawPass);
			options.uri = signPath('/event/' + eventRef + '/tastings', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
