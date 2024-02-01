const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkCreateStatusCode,
	checkStatusCodeByOptions,
	checkForSuccess,
	makeUniqueString,
	generateUserData,
	login,
	signPath,
} = require('../common.js');

describe('Tasting', () => {
	describe('Create', () => {
		let options, path, baseData, tastingResponse, checkProperTastingData, user, userData;

		before(async () => {
			// User
			let createUserPath = baseUrl + '/user';
			user = generateUserData();
			userData = await createItem(createUserPath, user);
			await login(user.email, user.rawPass);

			options = {...basePostOptions};
			path = signPath('/tasting', 'POST');

			baseData = {name: 'test_name'};
			tastingResponse = await createItem(path, baseData);

			checkProperTastingData = (tasting) => {
				// Check for property existence
				expect(tasting).to.not.have.property('id');
				expect(tasting).to.have.property('ref');
				expect(tasting).to.have.property('name');
				expect(tasting).to.have.property('producer');
				expect(tasting).to.have.property('country');
				expect(tasting).to.have.property('region');
				expect(tasting).to.have.property('vintage');
				expect(tasting).to.have.property('grape');
				expect(tasting).to.have.property('summary_wine');
				expect(tasting).to.have.property('summary_personal');
				expect(tasting).to.have.property('food_pairing');
				expect(tasting).to.have.property('rating');
				expect(tasting).to.have.property('notes');
				expect(tasting).to.have.property('images');
				expect(tasting).to.have.property('created_at');
				expect(tasting).to.have.property('price');
				expect(tasting).to.have.property('currency');
				expect(tasting).to.have.property('clean_key');
				expect(tasting).to.have.property('producer_key');
				expect(tasting).to.have.property('country_key');
				expect(tasting).to.have.property('region_key');
				expect(tasting).to.have.property('collection');
				expect(tasting).to.have.property('metadata');
				expect(tasting).to.have.property('location');
				expect(tasting).to.have.property('source');
				expect(tasting).to.have.property('info');
				expect(tasting).to.have.property('mold');
				expect(tasting).to.not.have.property('gps');
				expect(tasting).to.not.have.property('origin');

				// Check for correct data type
				expect(tasting.ref).to.be.a('string');
				expect(tasting.name).to.be.a('string');
				expect(tasting.producer).to.be.a('string');
				expect(tasting.country).to.be.a('string');
				expect(tasting.region).to.be.a('string');
				expect(tasting.vintage).to.be.a('string');
				expect(tasting.grape).to.be.a('string');
				expect(tasting.summary_wine).to.be.a('string');
				expect(tasting.summary_personal).to.be.a('string');
				expect(tasting.food_pairing).to.be.a('string');
				expect(tasting.rating).to.be.an('object');
				expect(tasting.notes).to.be.an('object');
				expect(tasting.images).to.be.an('array');
				expect(tasting.created_at).to.be.a.dateString();
				expect(tasting.price).to.be.an('number');
				expect(tasting.currency).to.be.an('string');
				expect(tasting.clean_key).to.be.an('string');
				expect(tasting.producer_key).to.be.an('string');
				expect(tasting.country_key).to.be.an('string');
				expect(tasting.region_key).to.be.an('string');
				expect(tasting.source).to.be.a('string');
				expect(tasting.info).to.be.an('object');

				expect(tasting.collection).to.satisfy(function (collection) {
					return collection === null || typeof collection === 'string';
				});

				expect(tasting.metadata).to.satisfy(function (metadata) {
					return metadata === null || typeof metadata === 'object';
				});

				expect(tasting.location).to.be.a('string');
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			path = signPath('/tasting', 'POST');
		});

		it('should return correct status code', async () => {
			let response = await createItem(path, baseData, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful', async () => {
			checkForSuccess(tastingResponse);
		});

		it('should return correct data', async () => {
			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should return correct data when a tasting is created from an event', async () => {
			//Create an Event
			let baseEventData = {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
			};
			let eventResponse = await createItem(signPath('/event', 'POST'), baseEventData);

			//Create a Tasting based on that Event
			baseData['collection'] = eventResponse.data.ref;
			let tastingResponse = await createItem(path, baseData);

			//Run Diagnostics
			expect(tastingResponse.data).to.have.property('collection');
			expect(tastingResponse.data.collection).to.be.a('string');
			expect(tastingResponse.data.collection).to.equal(eventResponse.data.ref);
		});

		it('should be successful when including a valid metadata in the payload', async () => {
			baseData['metadata'] = JSON.stringify({medal: 'gold'});
			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful when including an array of valid metadata in the payload', async () => {
			baseData['metadata'] = JSON.stringify([{medal: 'gold'}, {notes: 'This tasting is good'}]);
			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with json object metadata in the payload', async () => {
			// Json Object
			baseData['metadata'] = {
				medal_page: true,
				views: 1000,
			};
			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with hjson metadata in the payload', async () => {
			// No quotes , no comma, trailing comma
			baseData['metadata'] = "{medal_page:true \n 'views': 1000 , }";
			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should create an actual rows in db', async () => {
			// Test tastingResponse first
			expect(tastingResponse).to.have.property('data');
			expect(tastingResponse.data.ref).to.be.a('string').that.have.lengthOf.above(0);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref);

			let tasting = await request(options);

			// Test only defaults and for properties that will always be present
			expect(tasting).to.have.property('impression');
			expect(tasting).to.have.property('lifecycle');
			expect(tasting.impression.lifecycle_id).to.equal(1);
			expect(tasting).to.have.property('origin');
			expect(tasting.impression.origin_id).to.equal(0);
			expect(tasting).to.have.property('subject');
			expect(tasting).to.have.property('individual');
			expect(tasting.impression.ref).to.equal(tastingResponse.data.ref);
			expect(tasting.impression.owner_ref).to.equal(userData.data.ref);
			expect(tasting.impression.impression_type_id).to.equal(1);
		});

		it('should be successful even with [trimmable] characters in fields', async () => {
			let data = {name: '\ntest_name\n'};
			let response = await createItem(path, data, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be able to use as a [mold] when creating', async () => {
			// Create a mold
			options.body = baseData;
			options.method = 'POST';
			options.uri = signPath('/tasting', 'POST');
			let tasting = await request(options);

			// Mold an impression after it
			options.body.mold = tasting.data.ref;
			options.uri = signPath('/tasting', 'POST');
			let tastingWithMold = await request(options);
			expect(tastingWithMold.data.mold).to.equal(tasting.data.ref);
		});

		it('should not save duplicate notes if duplicated in the payload', async () => {
			let duplicateNotes = {
				'@': [
					'category_still',
					'nuance_rose',
					'nuance_orange',
					'clarity_hazy',
					'colorintensity_deep',
					'category_still',
					'nuance_rose',
					'nuance_orange',
					'clarity_hazy',
					'colorintensity_deep',
				],
				nose: [
					'condition_clean',
					'noseintensity_mediumplus',
					'development_fullydeveloped',
					'note_acacia',
					'note_chamomile',
					'note_violet',
					'note_tomato_leaf',
					'note_asparagus',
					'condition_clean',
					'noseintensity_mediumplus',
					'development_fullydeveloped',
					'note_acacia',
					'note_chamomile',
					'note_violet',
					'note_tomato_leaf',
					'note_asparagus',
				],
				palate: [
					'condition_clean',
					'noseintensity_mediumplus',
					'development_fullydeveloped',
					'note_acacia',
					'note_chamomile',
					'note_violet',
					'note_tomato_leaf',
					'note_asparagus',
					'condition_clean',
					'noseintensity_mediumplus',
					'development_fullydeveloped',
					'note_acacia',
					'note_chamomile',
					'note_violet',
					'note_tomato_leaf',
					'note_asparagus',
				],
			};

			// Add duplicate notes
			options.body = {
				name: makeUniqueString(),
				notes: duplicateNotes,
			};

			// Save the notes
			let createdTasting = null;
			options.uri = signPath('/tasting', 'POST');
			createdTasting = await request(options);

			// Transform object into array
			let updatedNotes = Object.values(createdTasting.data.notes);

			// Navigate through each note category
			for (let i = 0; i < updatedNotes.length; i++) {
				let noteCategory = updatedNotes[i];

				// Navigate through each note
				for (let i = 0; i < noteCategory.length; i++) {
					let note = noteCategory[i];
					let noteCount = noteCategory.filter(function (noteToTest) {
						return noteToTest === note;
					}).length;

					// Should only have 1 instance at any given time
					expect(noteCount).to.equal(1);
				}
			}
		});

		it('should be successful with valid fkey (json obj) in the payload', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				event_key: 'BBD',
				client_key: 'BBE',
				producer_key: 'BBF',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with valid fkey (json str) in the payload', async () => {
			baseData['fkey'] = JSON.stringify({
				origin: 'BB',
				subject_key: 'BBC',
				event_key: 'BBD',
				client_key: 'BBE',
				producer_key: 'BBF',
			});

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with valid fkey (hjson str) in the payload', async () => {
			baseData['fkey'] = "{ origin:'BB' \n 'subject_key':'BBC' , }";
			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with incomplete optional paramers (json obj) in the payload [required_only]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with incomplete optional paramers (json obj) in the payload [event_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				event_key: 'BBD',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with incomplete optional paramers (json obj) in the payload [client_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				client_key: 'BBE',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with incomplete optional paramers (json obj) in the payload [producer_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				producer_key: 'BBF',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with empty string (json obj) in the payload [event_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				event_key: '',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with empty string (json obj) in the payload [client_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				client_key: '',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with empty string (json obj) in the payload [producer_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				producer_key: '',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with whitespace (json obj) in the payload [event_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				event_key: ' ',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with whitespace (json obj) in the payload [client_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				client_key: ' ',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with whitespace (json obj) in the payload [producer_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				producer_key: ' ',
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with null value (json obj) in the payload [event_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				event_key: null,
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with null value (json obj) in the payload [client_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				client_key: null,
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful with null value (json obj) in the payload [producer_key]', async () => {
			baseData['fkey'] = {
				origin: 'BB',
				subject_key: 'BBC',
				producer_key: null,
			};

			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful and ignore if [fkey] is not an obj (int)', async () => {
			baseData['fkey'] = 0;
			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		it('should be successful and ignore if [fkey] is not an obj (array)', async () => {
			baseData['fkey'] = [];
			let response = await createItem(path, baseData, true);
			checkProperTastingData(response.body.data);
		});

		/* NEGATIVE TESTS */

		it('should return an error if payload is empty', async () => {
			let data = {};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if name is missing in payload', async () => {
			let data = {
				country: 'denmark',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if name is empty', async () => {
			let data = {name: ''};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if metadata value is an int', async () => {
			let data = {
				name: 'test_name',
				metadata: 123,
			};
			checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if metadata value is a invalid [string] stringified object', async () => {
			let data = {
				name: 'test_name',
				metadata: "{'test'}",
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if metadata value is a invalid [int] stringified object', async () => {
			let data = {
				name: 'test_name',
				metadata: '{324234}',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if metadata value is a invalid [array] stringified object', async () => {
			let data = {
				name: 'test_name',
				metadata: '{[]}',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [mold] ref is invalid', async () => {
			options.body = baseData;
			options.body.mold = '!#' + makeUniqueString();
			options.uri = signPath('/tasting', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [mold] ref does not exist', async () => {
			options.body = baseData;
			options.body.mold = makeUniqueString();
			options.uri = signPath('/tasting', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [fkey.origin] is not within whitelisted values (BB)', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: makeUniqueString(),
					subject_key: 'BBC',
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.origin] exceeds 127 characters', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: makeUniqueString(128),
					subject_key: makeUniqueString(128),
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.subject_key] exceeds 127 characters', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(130),
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.event_key] exceeds 127 characters', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(127),
					event_key: 'a'.repeat(130),
					client_key: 'a'.repeat(127),
					producer_key: 'a'.repeat(127),
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.client_key] exceeds 127 characters', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(127),
					event_key: 'a'.repeat(127),
					client_key: 'a'.repeat(130),
					producer_key: 'a'.repeat(127),
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.producer_key] exceeds 127 characters', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(127),
					client_key: 'a'.repeat(127),
					event_key: 'a'.repeat(127),
					producer_key: 'a'.repeat(130),
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if the total length of [fkey] exceeds 4000 characters', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(1000),
					event_key: 'a'.repeat(1000),
					client_key: 'a'.repeat(1000),
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey] contains any other property', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(127),
					event_key: 'a'.repeat(127),
					client_key: 'a'.repeat(127),
					someproperty: 'a'.repeat(127),
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.origin] is missing', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					subject_key: 'a'.repeat(127),
					event_key: 'a'.repeat(127),
					client_key: 'a'.repeat(127),
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.subject_key] is missing', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					event_key: 'a'.repeat(127),
					client_key: 'a'.repeat(127),
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.subject_key] does not match validation', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(126) + '$',
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.client_key] does not match validation', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(127),
					client_key: 'a'.repeat(126) + '$',
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.event_key] does not match validation', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(127),
					event_key: 'a'.repeat(126) + '$',
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [fkey.producer_key] does not match validation', async () => {
			let data = {
				name: 'test_name',
				fkey: {
					origin: 'BB',
					subject_key: 'a'.repeat(127),
					producer_key: 'a'.repeat(126) + '$',
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});
	});
});
