const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
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
	checkCreateStatusCode,
	login,
	signPath,
	createJsonFile,
} = require('../common.js');

const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];

describe('Event', () => {
	let options,
		user,
		userData,
		baseEventData,
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

		/****** Create users *******/
		let createUserPath = baseUrl + '/user';

		// Create users
		user = generateUserData();
		userData = await createItem(createUserPath, user);

		// Simulate login for user1
		await login(user.email, user.rawPass);

		baseEventData = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'private',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
		};

		eventResponse = await createItem(signPath('/event', 'POST'), baseEventData);
		eventRef = eventResponse.data.ref;
		exportFilePath = np.join(__dirname, './assets/exports/exportedTastings.json');
	});

	describe('Update', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = baseUrl + '/admin/event/' + eventRef + '/import/wines';
		});

		// Positive tests
		it('should import proper data', async () => {
			var filePath = np.join(__dirname, './assets/valid/wines.json');
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
			let responseData = response.body.data.tastings;

			// Sort before Matching
			responseData.sort((a, b) => (a.name > b.name ? 1 : -1));
			importData.wines.sort((a, b) => (a.name > b.name ? 1 : -1));

			expect(response.statusCode).to.equal(200);
			expect(responseData.length).to.equal(importData.wines.length);

			for (let ctr = 0; ctr <= responseData.length - 1; ctr++) {
				let importedTasting = responseData[ctr];
				let payloadTasting = importData.wines[ctr];

				expect(importedTasting.name).to.equal(payloadTasting.name);
				expect(importedTasting.producer).to.equal(payloadTasting.producer);
				expect(importedTasting.country).to.equal(payloadTasting.country);
				expect(importedTasting.region).to.equal(payloadTasting.region);
				expect(importedTasting.vintage).to.equal(payloadTasting.vintage);
				expect(importedTasting.grape).to.equal(payloadTasting.grape);
				expect(importedTasting.price).to.equal(payloadTasting.price);
				expect(importedTasting.currency).to.equal(payloadTasting.currency);
				expect(importedTasting.clean_key).to.equal(payloadTasting.clean_key);
				expect(importedTasting.producer_key).to.equal(payloadTasting.producer_key);
				expect(importedTasting.country_key).to.equal(payloadTasting.country_key);
				expect(importedTasting.region_key).to.equal(payloadTasting.region_key);
				expect(importedTasting.summary_wine).to.equal(payloadTasting.summary_wine);
				expect(importedTasting.summary_personal).to.equal(payloadTasting.summary_personal);
				expect(importedTasting.info).to.deep.equal(payloadTasting.info);

				// Rating.Version is not consumed by Web Client
				delete payloadTasting.rating['version'];
				expect(importedTasting.rating).to.deep.equal(payloadTasting.rating);

				// Sort before Matching
				for (var key in importedTasting.notes) {
					importedTasting.notes[key].sort();
					payloadTasting.notes[key].sort();
				}

				expect(importedTasting.notes).to.deep.equal(payloadTasting.notes);
				expect(importedTasting.metadata).to.not.deep.equal(JSON.parse('{}'));
			}
		});

		// Negative tests
		it('should not be successful with an empty file', async () => {
			options.formData = {};
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail when uploading invalid file extensions', async () => {
			for (const ext of invalidFileExts) {
				var filePath = np.join(__dirname, './assets/invalid/wine' + ext);
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
				wines: [
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
				wines: [
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
				wines: [
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
