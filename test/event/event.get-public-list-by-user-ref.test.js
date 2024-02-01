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
		user1Events,
		user1EventData,
		winesData,
		winesRefs,
		checkProperData,
		user1,
		user1Data,
		user2,
		user2Data,
		publicEvent,
		privateEvent,
		unlistedEvent,
		publicEventsByUserRefPath;

	before(async () => {
		options = {...baseGetOptions};

		checkProperData = (event, baseEvent = null) => {
			// Check for property existence
			expect(event).to.not.have.property('id');
			expect(event).to.have.property('ref');
			expect(event).to.have.property('owner_ref');
			expect(event).to.have.property('name');
			expect(event).to.have.property('description');
			expect(event).to.have.property('visibility');
			expect(event).to.have.property('start_date');
			expect(event).to.have.property('end_date');
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

			// Compare value of baseEvent and event
			if (baseEvent) {
				expect(baseEvent.name).to.equal(event.name);
				expect(baseEvent.description).to.equal(event.description);
				expect(baseEvent.visibility).to.equal(event.visibility);
				expect(new Date(baseEvent.start_date)).to.equalDate(new Date(event.start_date));
				expect(new Date(baseEvent.end_date)).to.equalDate(new Date(event.end_date));
				expect(baseEvent.sub_type).to.equal(event.sub_type);
			}
		};

		/****** Create users *******/
		let createUserPath = baseUrl + '/user';

		// Create users
		user1 = generateUserData();
		user1Data = await createItem(createUserPath, user1);

		publicEventsByUserRefPath = '/' + user1Data.data.ref + '/events';

		user2 = generateUserData();
		user2Data = await createItem(createUserPath, user2);

		// Simulate login for user1
		await login(user1.email, user1.rawPass);

		user1EventData = [];

		publicEvent = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'open',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
			sub_type: 'blind',
		};

		privateEvent = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'private',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
			sub_type: 'blind',
		};

		unlistedEvent = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'unlisted',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
			sub_type: 'blind',
		};

		user1EventData.push(publicEvent);
		user1EventData.push(privateEvent);
		user1EventData.push(unlistedEvent);

		user1Events = [];

		// Create events
		for (let data of user1EventData) {
			let response = await createItem(signPath('/event', 'POST'), data);
			user1Events.push(response.data);
		}
	});

	describe('Get Public Events', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath(publicEventsByUserRefPath, 'GET');
		});

		/* Positive tests */
		it('should return correct success status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data for events', async () => {
			let events = await request(options);

			for (let i = 0; i < events.length; i++) {
				checkProperData(events[i]);
			}
		});

		it('should access other users public events', async () => {
			// Simulate login for user2
			await login(user2.email, user2.rawPass);
			options.uri = signPath(publicEventsByUserRefPath, 'GET');
			let events = await request(options);
			expect(events).to.have.lengthOf.above(0);

			let publicEventFound = false;

			// User 2 must be able to fetch and see public events created by User 1
			for (let i = 0; i < events.length; i++) {
				if (events[i].name == publicEvent.name) {
					publicEventFound = true;
				}
			}

			expect(publicEventFound).to.equal(true);
		});

		/* NEGATIVE TESTS */

		it('should not access private events of other users', async () => {
			// Simulate login for user2
			await login(user2.email, user2.rawPass);

			let events = await request(options);
			let privateEventFound = false;

			for (let i = 0; i < events.length; i++) {
				if (events[i].name == privateEvent.name) {
					privateEventFound = true;
				}
			}

			// User 2 should not see private event of User 1
			expect(privateEventFound).to.equal(false);
		});

		it('should not access unlisted events events of other users', async () => {
			// Simulate login for user2
			await login(user2.email, user2.rawPass);

			let events = await request(options);
			let unlistedEventFound = false;

			for (let i = 0; i < events.length; i++) {
				if (events[i].name == unlistedEvent.name) {
					unlistedEventFound = true;
				}
			}

			// User 2 should not see unlisted event of User 1
			expect(unlistedEventFound).to.equal(false);
		});
	});
});
