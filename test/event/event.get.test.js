const chai = require('chai');
chai.use(require('chai-datetime'));
chai.use(require('chai-date-string'));
const expect = chai.expect;
const request = require('request-promise');

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
		anonymousUser,
		anonymousUserData,
		createEventPath,
		baseEventData,
		publicEventData,
		unlistedEventData,
		privateEventData,
		checkProperData,
		wines,
		winesData,
		eventResponse,
		eventRefPublic,
		eventRefPrivate,
		isOwner,
		eventRefUnlisted;

	before(async () => {
		options = {...baseGetOptions};
		checkProperData = (baseEvent, event) => {
			let wineRefs = baseEvent.wine_refs;

			// Check for property existence
			expect(event).to.not.have.property('id');
			expect(event).to.have.property('ref');
			expect(event).to.have.property('owner_ref');
			expect(event).to.have.property('name');
			expect(event).to.have.property('description');
			expect(event).to.have.property('visibility');
			expect(event).to.have.property('start_date');
			expect(event).to.have.property('end_date');
			expect(event).to.have.property('tastings');
			expect(event).to.have.property('stats');
			expect(event.stats).to.have.property('eventCreatedTastings');
			expect(event.stats).to.have.property('eventTastings');
			expect(event.stats).to.have.property('average_rating');
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
			expect(event.tastings).to.be.a('array');
			expect(event.stats).to.be.an('object');
			expect(event.stats.eventCreatedTastings).to.be.a('number');
			expect(event.stats.eventTastings).to.be.an('number');
			expect(event.stats.average_rating).to.be.an('object');
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
			``;
			expect(event.stats.eventCreatedTastings).to.equal(0);
			expect(event.stats.eventTastings).to.equal(winesData.length);

			// Check for correct data type
			expect(event.tastings).to.be.an('array');

			// Check for value
			for (let tasting of event.tastings) {
				expect(wineRefs.includes(tasting.ref)).to.equal(true);
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

		baseEventData = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'unlisted',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
			sub_type: 'blind',
		};

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

		baseEventData['wine_refs'] = wines.map((wine) => {
			return wine.ref;
		});

		// Create Public Event
		publicEventData = {...baseEventData};
		publicEventData['visibility'] = 'open';
		eventResponse = await createItem(signPath('/event', 'POST'), publicEventData);
		eventRefPublic = eventResponse.data.ref;

		// Create Private Event
		privateEventData = {...baseEventData};
		privateEventData['visibility'] = 'private';
		eventResponse = await createItem(signPath('/event', 'POST'), privateEventData);
		eventRefPrivate = eventResponse.data.ref;

		// Create Unlisted Event
		unlistedEventData = {...baseEventData};
		unlistedEventData['visibility'] = 'unlisted';
		eventResponse = await createItem(signPath('/event', 'POST'), unlistedEventData);
		eventRefUnlisted = eventResponse.data.ref;
	});

	describe('Get By Ref', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath('/event/' + eventRefPublic, 'GET');
			options.body = publicEventData;
		});

		/* Positive tests */
		it('should return correct status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data for the event', async () => {
			let event = await request(options);
			checkProperData(publicEventData, event);
		});

		it('should return full data for owners', async () => {
			let event = await request(options);
			checkProperData(publicEventData, event, false);
		});

		it('should be able to access private event if user is the owner of the event', async () => {
			options.uri = signPath('/event/' + eventRefPrivate, 'GET');
			await checkStatusCodeByOptions(options, 200);
		});

		it('should access public events by non-owner user', async () => {
			// login user2 and access the event created by user1
			await login(user2.email, user2.rawPass);
			options.uri = signPath('/event/' + eventRefPublic, 'GET');
			await checkStatusCodeByOptions(options, 200);
		});

		it('should access public events by non-owner user', async () => {
			// login user2 who is NOT the owner of the event
			await login(user2.email, user2.rawPass);
			options.uri = signPath('/event/' + eventRefUnlisted, 'GET');
			await checkStatusCodeByOptions(options, 200);
		});

		/* todo: Add a functionality that checks limited data for non-users */

		// it('should return full data for non-owner users', async () => {
		// 	// login user2 and access the event created by user1
		// 	await login(user2.email, user2.rawPass);
		// 	let event = await request(options);

		// 	checkProperData(baseEventData, event, false);
		// 	// todo: handle owner-statistics later (Ref:API-500)
		// 	// should not return statistics if not owner
		// });

		it('should flag a collection impression when tasted', async () => {
			// Login as non-affiliated user
			await login(user2.email, user2.rawPass);

			options.method = 'POST';
			options.uri = signPath(`/tasting`, 'POST');
			options.body = {
				name: makeUniqueString(),
				collection: eventRefPublic,
				mold: wines[0].ref,
			};
			let subject = await request(options);

			options.method = 'GET';
			options.uri = signPath('/event/' + eventRefPublic, 'GET');
			let event = await request(options);
			let tastings = event.tastings;

			for (let i = 0; i < tastings.length; i++) {
				let tasting = tastings[i];

				if (tasting.ref == subject.data.mold) {
					expect(tasting.existing_user_impression).to.equal(true);
					continue;
				}

				expect(tasting.existing_user_impression).to.equal(false);
			}

			// Login as the owner
			await login(user1.email, user1.rawPass);
			options.method = 'GET';
			options.uri = signPath('/event/' + eventRefPublic, 'GET');
			event = await request(options);
			tastings = event.tastings;

			for (let i = 0; i < tastings.length; i++) {
				let tasting = tastings[i];
				expect(tasting.existing_user_impression).to.equal(false);
			}
		});

		/* Negative Tests */
		it('should not be able to access non-existing event refs', async () => {
			let nonExistingEventRef = makeUniqueString();
			options.uri = signPath('/event/' + nonExistingEventRef, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to access private event if user is not the owner of the event', async () => {
			await login(user2.email, user2.rawPass);
			options.uri = signPath('/event/' + eventRefPrivate, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
