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
		addFeatureRoute,
		deleteFeatureRoute;

	before(async () => {
		options = {...basePostOptions};

		events = [];

		let today = new Date();
		let fiveDaysFromNow = new Date();
		fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
		startDate = getFormattedDate(today);
		endDate = getFormattedDate(fiveDaysFromNow);

		addFeatureRoute = baseUrl + '/events/featured/add?who=tex';
		deleteFeatureRoute = baseUrl + '/events/featured/remove?who=tex';

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
				uri: addFeatureRoute,
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

	describe('Delete Featured Events', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.uri = deleteFeatureRoute; //Only super_admin, admin and develop can access this
			options.body = {};

			// Featured test events before each and every test for testing delete
			let payload = {
				featured_events: events.map((event) => {
					return {
						event_ref: event,
						feature_start: startDate,
						feature_end: endDate,
					};
				}),
			};
			await addFeaturedEvents(payload);
		});

		it('should be able to remove [events] from being featured', async () => {
			options.body = {
				event_refs: events,
			};
			await checkStatusCodeByOptions(options, 202);
		});

		it('should be able to delete [events] regardless of who owns it', async () => {
			let payload = {
				featured_events: [
					{
						event_ref: otherEvent.data.ref,
						feature_start: startDate,
						feature_end: endDate,
					},
				],
			};
			await addFeaturedEvents(payload);
			options.body = {
				event_refs: [otherEvent.data.ref],
			};
			await checkStatusCodeByOptions(options, 202);
		});

		/*
    |--------------------------------------------------------------------------
    | Negative Tests
    |--------------------------------------------------------------------------
    */
		it('should fail if accessed by a user other than super_admin, admin and developer', async () => {
			options.body = {
				event_refs: events,
			};

			options.method = 'POST';
			options.uri = signPath('/events/featured/remove', options.method);
			await checkStatusCodeByOptions(options, 403);
		});

		it('should fail if payload is empty', async () => {
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to delete invalid [event] ref', async () => {
			let payload = {
				event_refs: events.map((event) => event),
			};
			payload['event_refs'].push('#@#$3-%^&');
			options.body = payload;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to delete non-existing [event] ref', async () => {
			let payload = {
				event_refs: events.map((event) => event),
			};
			payload['event_refs'].push(makeUniqueString(5));
			options.body = payload;
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
