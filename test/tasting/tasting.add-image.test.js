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
	checkStatusCodeByOptions,
	signPath,
	login,
	makeUniqueString,
	generateUserData,
} = require('../common.js');

const validFileExts = ['.jpg', '.jpeg', '.png'];
const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];

describe('Tasting', () => {
	describe('add image', () => {
		let options,
			path,
			addImagePath,
			baseData,
			tastingResponse,
			tastingImages = [],
			uploadedFileResponse,
			baseUserPath,
			user,
			userData;

		before(async () => {
			options = {...basePostOptions};
			baseUserPath = baseUrl + '/user';

			// Create user
			user = generateUserData();
			user.name = makeUniqueString();
			user.handle = makeUniqueString();
			userData = await createItem(baseUserPath, user);
			user.ref = userData.data.ref;

			// Simulate login for user
			await login(user.email, user.rawPass);

			path = '/tasting';
			baseData = {name: 'test_name'};
			tastingResponse = await createItem(signPath(path, 'POST'), baseData);
			addImagePath = path + '/addImage/' + tastingResponse.data.ref;
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			``;
			options.uri = signPath(addImagePath, 'POST');
		});

		it('should return correct status code', async () => {
			var filePath = np.join(__dirname, './assets/valid/wine.jpg');
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

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful when uploading allowed file types', async () => {
			for (const ext of validFileExts) {
				var filePath = np.join(__dirname, './assets/valid/wine' + ext);
				var fileName = np.basename(filePath);
				var type = mime.contentType(fileName);
				var file = fs.createReadStream(filePath);

				options.uri = signPath(addImagePath, 'POST');

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

				let response = await request(options);
				expect(response.statusCode).to.equal(201);
				tastingImages.push(response.body.data.fileRef);
			}
		});

		it('should be available as an image refs on a tasting', async () => {
			options.method = 'GET';
			options.uri = signPath('/tasting/' + tastingResponse.data.ref);
			options.formData = {};
			let response = await request(options);

			expect(response).to.have.property('images');
			for (let i = 0; i < tastingImages.length; i++) {
				expect(response.images.includes(tastingImages[i])).to.have.equal(true);
			}
		});

		it('should be available as a static resource', async () => {
			options.method = 'GET';
			options.formData = {};
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			for (let i = 0; i < tastingImages.length; i++) {
				options.uri = signPath('/images/' + tastingImages[i]);
				let response = await request(options);
				expect(response.statusCode).to.equal(200);
			}
		});

		it('should not be available as a static resource if [file] ref does not exist', async () => {
			options.method = 'GET';
			options.formData = {};
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			options.uri = signPath('/images/' + makeUniqueString(6));

			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be available as a static resource if [file] ref is invalid', async () => {
			options.method = 'GET';
			options.formData = {};
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			options.uri = signPath('/images/!' + makeUniqueString(), 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail when uploading file with valid extension , but invalid mime type', async () => {
			var filePath = np.join(__dirname, './assets/invalid/pdf_renamed_to_jpg.jpg');
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
		});

		it('should fail when uploading file with valid mime type , but invalid file extension', async () => {
			var filePath = np.join(__dirname, './assets/invalid/jpg_renamed_to.pdf');
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
		});

		it('should fail when uploading file larger than 10mb', async () => {
			var filePath = np.join(__dirname, './assets/invalid/wine-jumbo.jpg');
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
		});

		it('should fail when uploading invalid file extensions', async () => {
			for (const ext of invalidFileExts) {
				var filePath = np.join(__dirname, './assets/invalid/wine' + ext);
				var fileName = np.basename(filePath);
				var type = mime.contentType(fileName);
				var file = fs.createReadStream(filePath);

				options.uri = signPath(addImagePath, 'POST');
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

		it('should return an error if name is missing in payload', async () => {
			let data = {};
			await checkCreateStatusCode(options.uri, data, 400);
		});

		it('should return an error if uploadedFile is empty', async () => {
			options.formData = {};
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options).catch((err) => {
				expect(err.statusCode).to.equal(400);
			});
		});
	});
});
