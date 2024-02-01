const chai = require('chai');
const expect = chai.expect;
const request = require('request-promise');
require('chai-date-string')(chai);

const {
	baseUrl,
	baseGetOptions,
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
		theEvent,
		basePath,
		checkProperData,
		wines,
		winesData;

	before(async () => {
		options = {...baseGetOptions};
		checkProperData = (teacherData) => {
			// Check for property existence
			for (let i = 0; i < teacherData.length; i++) {
				expect(teacherData[i]).to.not.have.property('id');
				expect(teacherData[i]).to.have.property('email');
				expect(teacherData[i]).to.have.property('name');
				expect(teacherData[i]).to.have.property('created');
				expect(teacherData[i]).to.have.property('wine');
				expect(teacherData[i]).to.have.property('metadata');
				expect(teacherData[i]).to.have.property('final_points');
				expect(teacherData[i]).to.have.property('balance');
				expect(teacherData[i]).to.have.property('length');
				expect(teacherData[i]).to.have.property('intensity');
				expect(teacherData[i]).to.have.property('terroir');
				expect(teacherData[i]).to.have.property('complexity');
				expect(teacherData[i]).to.have.property('keynotes');
				expect(teacherData[i]).to.have.property('summary_wine');
				expect(teacherData[i]).to.have.property('summary_personal');
				expect(teacherData[i]).to.have.property('drinkability');
				expect(teacherData[i]).to.have.property('maturity');
				expect(teacherData[i]).to.have.property('location');
				expect(teacherData[i]).to.have.property('impression_id');
				expect(teacherData[i]).to.have.property('owner_ref');
			}
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

		// Create wines
		for (let data of winesData) {
			let tastingResponse = await createItem(signPath('/tasting', 'POST'), data);
			wines.push(tastingResponse.data);
		}

		baseEventData = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'private',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
			wine_refs: wines.map((wine) => {
				return wine.ref;
			}),
		};

		let response = await createItem(signPath('/event', 'POST'), baseEventData, true);
		theEvent = response.body.data;
		basePath = `/admin/event/${theEvent.ref}/export/teacher`;
	});

	describe('Export Teacher Data', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath(basePath, 'GET');
			options.body = baseEventData;
		});

		/* Positive tests */
		it('should return correct status code', async () => {
			checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data for events', async () => {
			let teacherData = await request(options);
			checkProperData(teacherData);
		});
	});
});
