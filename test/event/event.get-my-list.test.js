const chai = require('chai');
chai.use(require('chai-datetime'));
chai.use(require('chai-date-string'));
const expect = chai.expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	createItem,
	getItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	makeRandomInt,
	login,
	signPath,
} = require('../common.js');

describe('Event', () => {
	let options,
		events,
		wines,
		eventData,
		winesData,
		winesRefs,
		checkProperData,
		user1,
		user1Data,
		user2,
		user2Data,
		myEventsPath,
		publicEvent,
		privateEvent,
		unlistedEvent;

	before(async () => {
		options = {...baseGetOptions};
		myEventsPath = '/my-events';

		checkProperData = (baseEvent, event) => {
			// Check for property existence
			expect(event).to.not.have.property('id');
			expect(event).to.have.property('ref');
			expect(event).to.have.property('owner_ref');
			expect(event).to.have.property('name');
			expect(event).to.have.property('description');
			expect(event).to.have.property('visibility');
			expect(event).to.have.property('start_date');
			expect(event).to.have.property('end_date');
			expect(event).to.have.property('metadata');
			expect(event).to.have.property('avatar');
			expect(event).to.have.property('sub_type');

			// Check for correct data type
			expect(event.ref).to.be.a('string');
			expect(event.owner_ref).to.be.a('string');
			expect(event.name).to.be.a('string');
			expect(event.description).to.be.a('string');
			expect(event.visibility).to.be.a('string');
			expect(event.start_date).to.be.a.dateString();
			expect(event.end_date).to.be.a.dateString();
			expect(event.sub_type).to.be.a('string');

			expect(event.metadata).to.satisfy(function (metadata) {
				return metadata === null || typeof metadata === 'object';
			});

			// Check for value
			expect(baseEvent.name).to.equal(event.name);
			expect(baseEvent.description).to.equal(event.description);
			expect(baseEvent.visibility).to.equal(event.visibility);
			expect(new Date(baseEvent.start_date)).to.equalDate(new Date(event.start_date));
			expect(new Date(baseEvent.end_date)).to.equalDate(new Date(event.end_date));
			expect(baseEvent.sub_type).to.equal(event.sub_type);
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

		eventData = [];

		publicEvent = {
			name: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'open',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
			sub_type: 'blind',
		};

		privateEvent = {
			name: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'private',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
			sub_type: 'blind',
		};

		unlistedEvent = {
			name: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'unlisted',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
			sub_type: 'blind',
		};

		eventData.push(publicEvent);
		eventData.push(privateEvent);
		eventData.push(unlistedEvent);
		events = [];

		// Create events
		for (let data of eventData) {
			let response = await createItem(signPath('/event', 'POST'), data);
			events.push(response.data);
		}
	});

	describe('Get My Events', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath(myEventsPath, 'GET');
		});

		/* Positive tests */
		it('should return correct success status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return events related to the user', async () => {
			let events = await request(options);
			expect(events).to.have.lengthOf.above(0);
		});

		it('should return proper data for events', async () => {
			let events = await request(options);

			// Sort before Matching
			events.sort((a, b) => (a.name > b.name ? 1 : -1));
			eventData.sort((a, b) => (a.name > b.name ? 1 : -1));

			for (let i = 0; i < events.length; i++) {
				checkProperData(eventData[i], events[i]);
			}
		});

		it('should return private events', async () => {
			let events = await request(options);
			let found = false;
			events.forEach((event) => {
				if (event.visibility == 'private') {
					found = true;
				}
			});
			expect(found).to.equal(true);
		});

		it('should return unlisted events', async () => {
			let events = await request(options);
			let found = false;
			events.forEach((event) => {
				if (event.visibility == 'unlisted') {
					found = true;
				}
			});
			expect(found).to.equal(true);
		});

		/* Negative Tests */

		it('should not return deleted events', async () => {
			options.uri = signPath(myEventsPath, 'GET');
			let events = await request(options);

			//Delete one of the events
			let eventRefsToDelete = [events[0].ref];
			let deleteOptions = {
				method: 'POST',
				uri: signPath('/event/delete', 'POST'),
				json: true,
				body: {
					event_refs: eventRefsToDelete,
				},
			};

			await request(deleteOptions);

			// Fetch the events once more and verify that the even was indeed deleted
			options.uri = signPath(myEventsPath, 'GET');
			let eventsAfterDelete = await request(options);
			let found = false;
			eventsAfterDelete.forEach((event) => {
				if (event.ref == eventRefsToDelete[0]) {
					found = true;
				}
			});
			expect(found).to.equal(false);
		});

		it('should not return events to users that are not related to the event', async () => {
			// Simulate login the team user2
			await login(user2.email, user2.rawPass);
			options.uri = signPath(myEventsPath, 'GET');
			let events = await request(options);
			expect(events).to.have.lengthOf(0);
		});
	});
});
