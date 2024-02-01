const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const chai = require('chai');
const expect = chai.expect;
const request = require('request-promise');
chai.use(require('chai-date-string'));

const {
	baseUrl,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	generateUserData,
	makeUniqueString,
	login,
	signPath,
	createJsonFile,
	createContest,
	createContestCollection,
} = require('../common.js');

const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];

describe('Contest', () => {
	let options,
		userData,
		contestTeam,
		contestCollection,
		checkProperData,
		prepareFilePayload,
		wines,
		winesData,
		eventResponse,
		eventRef,
		exportFilePath;

	prepareFilePayload = (filePath) => {
		var fileName = np.basename(filePath);
		var type = mime.contentType(fileName);
		var file = fs.createReadStream(filePath);

		return {
			name: fileName,
			data: file,
			type: type,
		};
	};

	before(async () => {
		options = {...basePostOptions};

		// Create users
		let user = generateUserData();
		let createUserPath = baseUrl + '/user';
		userData = await createItem(createUserPath, user);

		// Simulate login for user1
		await login(user.email, user.rawPass);

		// Create a contest
		contestTeam = await createContest();

		// Add a contest collection
		contestCollection = await createContestCollection(contestTeam.data.ref);

		// File export path
		exportFilePath = np.join(__dirname, './assets/exports/exportedTastings.json');
	});

	describe('Import Impressions', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath(
				`/admin/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/import/impressions`,
				'POST'
			);
		});

		// Positive tests
		it('should import proper data', async () => {
			var filePath = np.join(__dirname, './assets/valid/impressions.json');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			options.formData = {
				uploadedFile: {
					value: file,
					options: {
						filename: fileName,
						contentType: type,
					},
				},
			};

			var fileStream = fs.readFileSync(filePath, 'utf8');
			var importData = JSON.parse(fileStream);

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			let responseData = response.body.data.impressions;

			// Sort before Matching
			responseData.sort((a, b) => (a.name > b.name ? 1 : -1));
			importData.impressions.sort((a, b) => (a.name > b.name ? 1 : -1));

			expect(response.statusCode).to.equal(200);
			expect(responseData.length).to.equal(importData.impressions.length);

			for (let ctr = 0; ctr <= responseData.length - 1; ctr++) {
				let importedImpression = responseData[ctr];
				let payloadTasting = importData.impressions[ctr];

				expect(importedImpression.name).to.equal(payloadTasting.name);
				expect(importedImpression.producer).to.equal(payloadTasting.producer);
				expect(importedImpression.country).to.equal(payloadTasting.country);
				expect(importedImpression.region).to.equal(payloadTasting.region);
				expect(importedImpression.vintage).to.equal(payloadTasting.vintage);
				expect(importedImpression.grape).to.equal(payloadTasting.grape);
				expect(importedImpression.price).to.equal(payloadTasting.price);
				expect(importedImpression.currency).to.equal(payloadTasting.currency);
				expect(importedImpression.clean_key).to.equal(payloadTasting.clean_key);
				expect(importedImpression.producer_key).to.equal(payloadTasting.producer_key);
				expect(importedImpression.country_key).to.equal(payloadTasting.country_key);
				expect(importedImpression.region_key).to.equal(payloadTasting.region_key);
				expect(importedImpression.summary_wine).to.equal(payloadTasting.summary_wine);
				expect(importedImpression.summary_personal).to.equal(payloadTasting.summary_personal);
				expect(importedImpression.info).to.deep.equal(payloadTasting.info);

				// Rating.Version is not consumed by Web Client
				delete payloadTasting.rating['version'];
				expect(importedImpression.rating).to.deep.equal(payloadTasting.rating);

				// Sort before Matching
				for (var key in importedImpression.notes) {
					importedImpression.notes[key].sort();
					payloadTasting.notes[key].sort();
				}

				expect(importedImpression.notes).to.deep.equal(payloadTasting.notes);
				expect(importedImpression.metadata).to.not.deep.equal(JSON.parse('{}'));
			}
		});

		// Negative tests
		it('should return an error if contest ref is non-existing', async () => {
			var filePath = np.join(__dirname, './assets/valid/impressions.json');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			options.formData = {
				uploadedFile: {
					value: file,
					options: {
						filename: fileName,
						contentType: type,
					},
				},
			};

			var fileStream = fs.readFileSync(filePath, 'utf8');
			var importData = JSON.parse(fileStream);

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let nonExistingContestRef = makeUniqueString();
			options.uri = signPath(
				`/admin/contest/${nonExistingContestRef}/collection/${contestCollection.ref}/import/impressions`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if collection ref is non-existing', async () => {
			var filePath = np.join(__dirname, './assets/valid/impressions.json');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			options.formData = {
				uploadedFile: {
					value: file,
					options: {
						filename: fileName,
						contentType: type,
					},
				},
			};

			var fileStream = fs.readFileSync(filePath, 'utf8');
			var importData = JSON.parse(fileStream);

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let nonExistingCollectionRef = makeUniqueString();
			options.uri = signPath(
				`/admin/contest/${contestTeam.data.ref}/collection/${nonExistingCollectionRef}/import/impressions`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if collection does not belong to the contest', async () => {
			// Create a new contest
			let contestPayload = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};

			let createContestPath = signPath('/contest/new', 'POST');
			let newContest = await createItem(createContestPath, contestPayload);

			var filePath = np.join(__dirname, './assets/valid/impressions.json');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			options.formData = {
				uploadedFile: {
					value: file,
					options: {
						filename: fileName,
						contentType: type,
					},
				},
			};

			var fileStream = fs.readFileSync(filePath, 'utf8');
			var importData = JSON.parse(fileStream);

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let nonExistingCollectionRef = makeUniqueString();
			options.uri = signPath(
				`/admin/contest/${newContest.data.ref}/collection/${contestCollection.ref}/import/impressions`,
				'POST'
			);

			// The API should return an error since newContest does not own the initial contestCollection
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the impression key is invalid', async () => {
			/*
				The API expects the json file to have an object with the property name "impressions"
				If the property name is something else, the API is expected to return an error.			
			*/

			var filePath = np.join(__dirname, './assets/invalid/invalid-key.json');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			options.formData = {
				uploadedFile: {
					value: file,
					options: {
						filename: fileName,
						contentType: type,
					},
				},
			};

			var fileStream = fs.readFileSync(filePath, 'utf8');
			var importData = JSON.parse(fileStream);

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be successful with an empty file', async () => {
			options.formData = {};
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail when uploading invalid file extensions', async () => {
			for (const ext of invalidFileExts) {
				var filePath = np.join(__dirname, './assets/invalid/impressions' + ext);
				var fileName = np.basename(filePath);
				var type = mime.contentType(fileName);
				var file = fs.createReadStream(filePath);

				options.formData = {
					uploadedFile: {
						value: file,
						options: {
							filename: fileName,
							contentType: type,
						},
					},
				};

				await checkStatusCodeByOptions(options, 400);
			}
		});

		it('should return an error when [name] is empty', async () => {
			var data = {
				impressions: [
					{
						name: '',
					},
				],
			};

			createJsonFile(exportFilePath, data);

			let file = prepareFilePayload(exportFilePath);

			options.formData = {
				uploadedFile: {
					value: file.data,
					options: {
						filename: file.name,
						contentType: file.type,
					},
				},
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error when [name] is null', async () => {
			var data = {
				impressions: [
					{
						name: null,
					},
				],
			};

			createJsonFile(exportFilePath, data);

			let file = prepareFilePayload(exportFilePath);

			options.formData = {
				uploadedFile: {
					value: file.data,
					options: {
						filename: file.name,
						contentType: file.type,
					},
				},
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error when [name] exceeds (128) characters', async () => {
			var data = {
				impressions: [
					{
						name: makeUniqueString(129),
					},
				],
			};

			createJsonFile(exportFilePath, data);

			let file = prepareFilePayload(exportFilePath);

			options.formData = {
				uploadedFile: {
					value: file.data,
					options: {
						filename: file.name,
						contentType: file.type,
					},
				},
			};

			await checkStatusCodeByOptions(options, 400);
		});

		// todo : add other impression field tests
	});
});
