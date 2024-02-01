const chai = require('chai');
const expect = chai.expect;
const request = require('request-promise');
require('chai-date-string')(chai);
chai.use(require('chai-datetime'));
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];

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
	getBackendTime,
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
		winesData;

	before(async () => {
		options = {...basePostOptions};
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
			expect(event).to.have.property('tastings');
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
	});

	describe('Create', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath('/event', 'POST');

			baseEventData = {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
				sub_type: 'blind',
			};

			options.body = baseEventData;
		});

		/* Positive tests */
		it('should return correct status code', async () => {
			let response = await createItem(signPath('/event', 'POST'), baseEventData, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should return proper data for events', async () => {
			let event = await createItem(signPath('/event', 'POST'), baseEventData);
			checkProperData(baseEventData, event.data);
		});

		it('should be successful when adding valid visibility', async () => {
			let validVisibilities = ['open', 'unlisted', 'private'];

			for (let visibility of validVisibilities) {
				options.uri = signPath('/event', 'POST');
				options.body['visibility'] = visibility;
				await checkStatusCodeByOptions(options, 201);
			}
		});

		it('should add wines that belongs to the current user to an event', async () => {
			baseEventData['wine_refs'] = wines.map((wine) => {
				return wine.ref;
			});

			let response = await createItem(signPath('/event', 'POST'), baseEventData);
			let eventRefs = response.data.tastings.map((value) => value['ref']);

			for (let ref of baseEventData['wine_refs']) {
				expect(eventRefs.includes(ref)).to.equal(true);
			}
		});

		it('should be successful when adding an event with host team that user has valid access', async () => {
			//Create Host Team with User 1
			let teamData = {
				handle: makeUniqueString(),
				name: makeUniqueString(),
				description: makeUniqueString(),
				visibility: 'public',
			};
			let teamResponse = await createItem(signPath('/team', 'POST'), teamData);

			//Create Event with Host Team
			baseEventData['host'] = teamResponse.data.ref;
			let eventResponse = await createItem(signPath('/event', 'POST'), baseEventData);

			expect(eventResponse.data).to.have.property('host');
			expect(eventResponse.data.host).to.be.a('string');
			expect(eventResponse.data.host).to.equal(teamResponse.data.ref);
		});

		it('should be successful when including a valid metadata in the payload', async () => {
			baseEventData['metadata'] = JSON.stringify({medal: 'gold'});
			let event = await createItem(signPath('/event', 'POST'), baseEventData);
			checkProperData(baseEventData, event.data);
		});

		it('should be successful when including an array of valid metadata in the payload', async () => {
			baseEventData['metadata'] = JSON.stringify([
				{medal: 'gold'},
				{notes: 'This tasting is good'},
			]);
			let event = await createItem(signPath('/event', 'POST'), baseEventData);
			checkProperData(baseEventData, event.data);
		});

		it('should be successful when including hjson metadata in the payload', async () => {
			// No quotes , no comma, trailing comma
			baseEventData['metadata'] = "{medal_page:true \n 'views': 1000 , }";
			let event = await createItem(signPath('/event', 'POST'), baseEventData);
			checkProperData(baseEventData, event.data);
		});

		it('should be successful when including json (object) metadata in the payload', async () => {
			// Json Object
			baseEventData['metadata'] = {
				medal_page: true,
				views: 1000,
			};
			let event = await createItem(signPath('/event', 'POST'), baseEventData);
			checkProperData(baseEventData, event.data);
		});

		it('should be successful even with [trimmable] characters in fields', async () => {
			let data = {
				name: makeUniqueString(),
				description: '\nEvent description\n',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
			};
			let response = await createItem(signPath('/event', 'POST'), data, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be able to upload/update a profile pic', async () => {
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);
			var uploadOptions = {
				method: 'POST',
				uri: options.uri,
				formData: {
					name: makeUniqueString(),
					avatar: {
						value: file,
						options: {
							filename: fileName,
							contentType: type,
						},
					},
				},
				headers: {
					'content-type': 'multipart/form-data',
				},
			};

			uploadOptions.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(uploadOptions);
			expect(response.statusCode).to.equal(201);
		});

		/* Negative Tests */
		it('should return an error if payload is empty', async () => {
			options.body = {};
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should ignore and not add refs that are invalid and non-existing', async () => {
			baseEventData['wine_refs'] = [makeUniqueString(), makeUniqueString(), makeUniqueString()];
			let response = await createItem(signPath('/event', 'POST'), baseEventData);
			let event = response.data;
			expect(event.tastings.length).to.equal(0);
		});

		it('should return error when adding wines that dont belong to the current user', async () => {
			await login(user2.email, user2.rawPass);

			options.body['wine_refs'] = wines.map((wine) => {
				return wine.ref;
			});

			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error when events with invalid visibility', async () => {
			options.body['visibility'] = 'invalidVisibiliy';
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error when events with invalid start_date', async () => {
			options.body['start_date'] = '1234';
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error when events with invalid end_date', async () => {
			options.body['end_date'] = '1234';
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error when events filled with start_date has missing end_date', async () => {
			delete options.body.end_date;
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error when events filled with end_date has missing start_date', async () => {
			delete options.body.start_date;
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error when users enter an event end date prior to the event start date.', async () => {
			options.body.start_date = await getBackendTime(10);
			options.body.end_date = await getBackendTime(1);
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if metadata value is an int', async () => {
			options.body['metadata'] = 123;
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if metadata value is a invalid [string] stringified object', async () => {
			options.body['metadata'] = "{'test'}";
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if metadata value is a invalid [int] stringified object', async () => {
			options.body['metadata'] = '{324234}';
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if metadata value is a invalid [array] stringified object', async () => {
			options.body['metadata'] = '{[]}';
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if sub_type is not a valid sub event type', async () => {
			options.body['sub_type'] = makeUniqueString();
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if sub_type is main event type', async () => {
			options.body['sub_type'] = 'event';
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail when uploading invalid file extensions', async () => {
			for (const ext of invalidFileExts) {
				var filePath = np.join(__dirname, './assets/invalid/wine' + ext);
				var fileName = np.basename(filePath);
				var type = mime.contentType(fileName);
				var file = fs.createReadStream(filePath);

				var uploadOptions = {
					method: 'POST',
					uri: signPath('/event', 'POST'),
					formData: {
						name: makeUniqueString(),
						avatar: {
							value: file,
							options: {
								filename: fileName,
								contentType: type,
							},
						},
					},
					headers: {
						'content-type': 'multipart/form-data',
					},
				};

				uploadOptions.transform = (body, response, resolveWithFullResponse) => {
					return response;
				};

				await checkStatusCodeByOptions(uploadOptions, 400);
			}
		});
	});
});
