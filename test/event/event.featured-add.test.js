const chai = require('chai');
const expect = chai.expect;
const request = require('request-promise');
require('chai-date-string')(chai);

const {
	baseUrl,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	makeIsoDateString,
	checkCreateStatusCode,
	login,
	signPath,
	getFormattedDate,
} = require('../common.js');

describe('Event', () => {
	let options,
		user1,
		user1Data,
		user2,
		user2Data,
		baseEventData,
		events,
		otherEvent,
		startDate,
		endDate,
		addFeaturedEvents,
		adminRoute;

	before(async () => {
		options = {...basePostOptions};

		events = [];

		let today = new Date();
		let fiveDaysFromNow = new Date();
		fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
		startDate = getFormattedDate(today);
		endDate = getFormattedDate(fiveDaysFromNow);

		adminRoute = baseUrl + '/events/featured/add?who=tex';

		/****** Create users *******/
		let createUserPath = baseUrl + '/user';

		// Create users
		user1 = generateUserData();
		user1Data = await createItem(createUserPath, user1);

		user2 = generateUserData();
		user2Data = await createItem(createUserPath, user2);

		// Simulate login for user1
		await login(user1.email, user1.rawPass);

		options.transform = null;
		options.uri = signPath('/event', 'POST');
		baseEventData = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'private',
			start_date: '2019-01-14 14:23:28',
			end_date: '2025-01-20 19:23:28',
		};
		options.body = baseEventData;

		// Create Events for user1
		for (let i = 0; i <= 4; i++) {
			let response = await createItem(signPath('/event', 'POST'), baseEventData);
			events.push(response.data.ref);
		}

		// Simulate login for user2
		await login(user2.email, user2.rawPass);
		otherEvent = await createItem(signPath('/event', 'POST'), baseEventData);

		// Login back to user 1 for postivite tests
		await login(user1.email, user1.rawPass);

		addFeaturedEvents = async (featuredDatas) => {
			let options = {
				uri: adminRoute,
				method: 'POST',
				json: true,
				body: featuredDatas,
				transform: (body, response, resolveWithFullResponse) => {
					return response;
				},
			};

			return await request(options);
		};
	});

	describe('Add Featured Events', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.uri = adminRoute; //Only super_admin, admin and develop can access this
			options.body = {};
		});

		it('should be able to add featured events', async () => {
			let payload = {
				featured_events: [],
			};

			for (let i = 0; i <= events.length - 1; i++) {
				let featuredData = {
					event_ref: events[i],
					feature_start: startDate,
					feature_end: endDate,
				};

				payload['featured_events'].push(featuredData);
			}

			let featuredResponse = await addFeaturedEvents(payload);
			expect(featuredResponse.statusCode).to.equal(201);

			for (let data of featuredResponse.body.data) {
				expect(data).to.have.property('feature_start');
				expect(data).to.have.property('feature_end');
				expect(data).to.have.property('collection');

				expect(data.feature_start).to.be.a.dateString();
				expect(data.feature_end).to.be.a.dateString();
				expect(data.collection).to.be.an('object');

				expect(data.feature_start).to.equals(startDate);
				expect(data.feature_end).to.equals(endDate);
				expect(events.includes(data.collection.ref)).to.equal(true);
			}
		});

		it('should be able to feature [events] regardless of who owns it', async () => {
			let featuredDatas = {};
			featuredDatas['featured_events'] = [];

			let feature_start = startDate;
			let feature_end = endDate;

			let featuredData = {
				event_ref: otherEvent.data.ref,
				feature_start: feature_start,
				feature_end: feature_end,
			};

			featuredDatas['featured_events'].push(featuredData);
			options.body = featuredDatas;
			await checkStatusCodeByOptions(options, 201);
		});

		/*
    |--------------------------------------------------------------------------
    | Negative Tests
    |--------------------------------------------------------------------------
    */
		it('should fail if accessed by a user other than super_admin, admin and developer', async () => {
			await login(user1.email, user1.rawPass);
			options.uri = signPath('/events/featured/add', 'POST');
			await checkStatusCodeByOptions(options, 403);
		});

		it('should fail if payload is empty', async () => {
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to feature invalid [event] ref', async () => {
			let featuredDatas = {};
			featuredDatas['featured_events'] = [];

			let feature_start = makeIsoDateString(0, 0, -1);
			let feature_end = makeIsoDateString(0, 0, 1);

			let featuredData = {
				event_ref: '!' + makeUniqueString(5),
				feature_start: startDate,
				feature_end: endDate,
			};

			featuredDatas['featured_events'].push(featuredData);
			options.body = featuredDatas;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to feature non-existing [event] ref', async () => {
			let featuredDatas = {};
			featuredDatas['featured_events'] = [];

			let feature_start = makeIsoDateString(0, 0, -1);
			let feature_end = makeIsoDateString(0, 0, 1);

			let featuredData = {
				event_ref: makeUniqueString(6),
				feature_start: feature_start,
				feature_end: feature_end,
			};

			featuredDatas['featured_events'].push(featuredData);
			options.body = featuredDatas;
			await checkStatusCodeByOptions(options, 400);
		});

		it("should not be able to feature [events] before today's date ", async () => {
			let featuredDatas = {};
			featuredDatas['featured_events'] = [];

			let feature_start = makeIsoDateString(0, 0, -1);
			let feature_end = makeIsoDateString(0, 0, 256);

			let featuredData = {
				event_ref: events[0],
				feature_start: feature_start,
				feature_end: feature_end,
			};

			featuredDatas['featured_events'].push(featuredData);
			options.body = featuredDatas;
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
