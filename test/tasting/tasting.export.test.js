const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkCreateStatusCode,
	checkForSuccess,
	makeUniqueString,
	generateUserData,
	login,
	signPath,
} = require('../common.js');

describe('Tasting', () => {
	describe('Export', () => {
		let options,
			path,
			filePath,
			baseTastingData,
			baseEventData,
			maxWines,
			insertedTastings,
			tastingResponse,
			eventResponse,
			checkProperTastingData,
			user,
			userData;

		before(async () => {
			// Generate User
			let createUserPath = baseUrl + '/user';
			user = generateUserData();
			userData = await createItem(createUserPath, user);
			await login(user.email, user.rawPass);

			options = {...basePostOptions};
			baseTastingData = {
				name: makeUniqueString(),
				producer: makeUniqueString(),
				country: makeUniqueString(),
				region: makeUniqueString(),
				grape: makeUniqueString(),
				summary_wine: makeUniqueString(),
				summary_personal: makeUniqueString(),
			};

			// Generate Tastings
			maxWines = 5;
			insertedTastings = [];
			for (let ctr = 1; ctr <= maxWines; ctr++) {
				path = signPath('/tasting', 'POST');
				tastingResponse = await createItem(path, baseTastingData);
				insertedTastings.push(tastingResponse.data);
			}

			// Generate Event
			baseEventData = {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
			};

			path = signPath('/event', 'POST');
			eventResponse = await createItem(path, baseEventData);

			// File Init
			filePath = np.join(__dirname, './assets/exports/exportedTastings.json');

			checkProperTastingData = (exportedTasting, insertedTasting, importing = false) => {
				// Check for property existence
				expect(exportedTasting).to.not.have.property('id');
				expect(exportedTasting).to.have.property('ref');
				expect(exportedTasting).to.have.property('name');
				expect(exportedTasting).to.have.property('producer');
				expect(exportedTasting).to.have.property('country');
				expect(exportedTasting).to.have.property('region');
				expect(exportedTasting).to.have.property('vintage');
				expect(exportedTasting).to.have.property('grape');
				expect(exportedTasting).to.have.property('summary_wine');
				expect(exportedTasting).to.have.property('summary_personal');
				expect(exportedTasting).to.have.property('rating');
				expect(exportedTasting).to.have.property('notes');
				expect(exportedTasting).to.have.property('images');
				expect(exportedTasting).to.have.property('created_at');
				expect(exportedTasting).to.have.property('price');
				expect(exportedTasting).to.have.property('currency');
				expect(exportedTasting).to.have.property('clean_key');
				expect(exportedTasting).to.have.property('collection');
				expect(exportedTasting).to.have.property('metadata');
				expect(exportedTasting).to.have.property('location');
				expect(exportedTasting).to.have.property('source');
				expect(exportedTasting).to.not.have.property('gps');
				expect(exportedTasting).to.not.have.property('origin');

				// Check for correct data type
				expect(exportedTasting.ref).to.be.a('string');
				expect(exportedTasting.name).to.be.a('string');
				expect(exportedTasting.producer).to.be.a('string');
				expect(exportedTasting.country).to.be.a('string');
				expect(exportedTasting.region).to.be.a('string');
				expect(exportedTasting.vintage).to.be.a('string');
				expect(exportedTasting.grape).to.be.a('string');
				expect(exportedTasting.summary_wine).to.be.a('string');
				expect(exportedTasting.summary_personal).to.be.a('string');
				expect(exportedTasting.rating).to.be.an('object');
				expect(exportedTasting.notes).to.be.an('object');
				expect(exportedTasting.images).to.be.an('array');
				expect(exportedTasting.created_at).to.be.a.dateString();
				expect(exportedTasting.price).to.be.an('number');
				expect(exportedTasting.currency).to.be.an('string');
				expect(exportedTasting.clean_key).to.be.a('string');
				expect(exportedTasting.producer_key).to.be.a('string');
				expect(exportedTasting.country_key).to.be.a('string');
				expect(exportedTasting.region_key).to.be.a('string');
				expect(exportedTasting.source).to.be.a('string');

				expect(exportedTasting.collection).to.satisfy(function (collection) {
					return collection === null || typeof collection === 'string';
				});

				expect(exportedTasting.metadata).to.satisfy(function (metadata) {
					return metadata === null || typeof metadata === 'object';
				});

				expect(exportedTasting.location).to.be.a('string');

				//Check for Values
				expect(exportedTasting.name).to.equal(insertedTasting.name);
				expect(exportedTasting.producer).to.equal(insertedTasting.producer);
				expect(exportedTasting.country).to.equal(insertedTasting.country);
				expect(exportedTasting.region).to.equal(insertedTasting.region);
				expect(exportedTasting.vintage).to.equal(insertedTasting.vintage);
				expect(exportedTasting.grape).to.equal(insertedTasting.grape);
				expect(exportedTasting.summary_wine).to.equal(insertedTasting.summary_wine);
				expect(exportedTasting.summary_personal).to.equal(insertedTasting.summary_personal);
				expect(exportedTasting.rating).to.deep.equal(insertedTasting.rating);
				expect(exportedTasting.notes).to.deep.equal(insertedTasting.notes);
				expect(exportedTasting.images).to.deep.equal(insertedTasting.images);
				expect(exportedTasting.price).to.equal(insertedTasting.price);
				expect(exportedTasting.currency).to.equal(insertedTasting.currency);
				expect(exportedTasting.clean_key).to.equal(insertedTasting.clean_key);
				expect(exportedTasting.producer_key).to.equal(insertedTasting.producer_key);
				expect(exportedTasting.country_key).to.equal(insertedTasting.country_key);
				expect(exportedTasting.region_key).to.equal(insertedTasting.region_key);
				expect(exportedTasting.metadata).to.deep.equal(insertedTasting.metadata);

				if (!importing) {
					expect(exportedTasting).to.have.property('replay');
					expect(exportedTasting.ref).to.equal(insertedTasting.ref);
					expect(exportedTasting.created_at).to.equal(insertedTasting.created_at);
					expect(exportedTasting.replay.user_ref).to.equal(userData.data.ref);
				}
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath('/admin/user/' + userData.data.ref + '/export/tastings', 'GET');
		});

		it('should return proper data', async () => {
			let exportedResponse = await request(options);
			let exportedTastings = exportedResponse.wines;

			// Sort before Matching
			insertedTastings.sort((a, b) => (a.ref > b.ref ? 1 : -1));
			exportedTastings.sort((a, b) => (a.ref > b.ref ? 1 : -1));

			for (let ctr = 0; ctr <= exportedTastings.length - 1; ctr++) {
				let insertedTasting = insertedTastings[ctr];
				let exportedTasting = exportedTastings[ctr];
				checkProperTastingData(exportedTasting, insertedTasting);
			}
		});

		it('should be replayable', async () => {
			let exportedResponse = await request(options);
			let exportedTastings = exportedResponse.wines;

			for (let ctr = 0; ctr <= exportedTastings.length - 1; ctr++) {
				let exportedTasting = exportedTastings[ctr];
				exportedTasting['replay'] = JSON.stringify(exportedTasting['replay']);

				options.method = 'POST';
				options.uri = signPath('/admin/replay/tasting', 'POST');
				options.body = exportedTasting;
				options.transform = (body, response, resolveWithFullResponse) => {
					return response;
				};

				let replayTastingResponse = await request(options);
				expect(replayTastingResponse.statusCode).to.equal(201);
				expect(replayTastingResponse.body.data.name).to.equal(exportedTasting.name);
				maxWines += 1;
			}
		});

		it('should be exportable', async () => {
			// Get Exports
			let exportedResponse = await request(options);
			let exportedTastings = exportedResponse.wines;

			expect(exportedTastings.length).to.equal(maxWines);

			// Generate Import File
			var data = {
				wines: exportedTastings,
			};

			// Write File
			let buffer = Buffer.from(JSON.stringify(data));
			fs.writeFileSync(filePath, buffer);
		});

		it('should be importable', async () => {
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);
			var fileStream = fs.readFileSync(filePath, 'utf8');
			var jsonData = JSON.parse(fileStream);

			delete options.body;
			options.method = 'POST';
			options.uri = baseUrl + '/admin/event/' + eventResponse.data.ref + '/import/wines';
			options.formData = {
				uploadedFile: {
					value: file,
					options: {
						filename: fileName,
						contentType: type,
					},
				},
			};

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let importResponse = await request(options);
			let importedTastings = importResponse.body.data.tastings;
			let exportedTastings = jsonData.wines;

			expect(importResponse.body.data.tastings.length).to.equal(exportedTastings.length);
			expect(importResponse.statusCode).to.equal(200);

			// Sort before Matching
			importedTastings.sort((a, b) => (a.name > b.name ? 1 : -1));
			exportedTastings.sort((a, b) => (a.name > b.name ? 1 : -1));

			for (let ctr = 0; ctr <= importedTastings.length - 1; ctr++) {
				let importedTasting = importedTastings[ctr];
				let exportedTasting = exportedTastings[ctr];
				await checkProperTastingData(importedTasting, exportedTasting, true);
			}

			// Delete File
			fs.unlink(filePath, function (err) {});
		});
	});
});
