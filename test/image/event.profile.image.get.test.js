const expect = require('chai').expect;
const request = require('request-promise');
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const {
	baseUrl,
	baseGetOptions,
	createItem,
	checkStatusCodeByOptions,
	makeUniqueString,
	login,
	signPath,
	generateUserData,
	sha256,
	md5,
	validMD5,
} = require('../common.js');

describe('Images', () => {
	describe('Get Event Profile Image', () => {
		let options, baseUserPath, imagePath, imageRef, user, userData;

		before(async () => {
			options = {...baseGetOptions};
			baseUserPath = baseUrl + '/user';
			imagePath = '/images/';

			// Create User
			user = generateUserData();
			user.name = makeUniqueString();
			user.handle = makeUniqueString();
			userData = await createItem(baseUserPath, user);
			user.ref = userData.data.ref;

			// Login
			await login(user.email, user.rawPass);

			// Upload Profile Image
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);
			var uploadOptions = {
				method: 'POST',
				uri: signPath('/event', 'POST'),
				formData: {
					name: makeUniqueString(),
					handle: makeUniqueString(),
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
			let response = await request(uploadOptions);
			response = JSON.parse(response);

			// Get Image Ref
			imageRef = response.data.avatar;
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = baseUrl + imagePath + imageRef;
		});

		// Positive Tests
		it('should be successful with signed url', async () => {
			options.uri = signPath(imagePath + imageRef, 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful with unsigned url', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		// Negative Tests
		it('should return an error with an invalid ref (signed)', async () => {
			options.uri = signPath(imagePath + makeUniqueString(), 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error with an invalid ref (unsigned)', async () => {
			options.uri = baseUrl + imagePath + makeUniqueString();
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error with an empty ref (signed)', async () => {
			options.uri = signPath(imagePath, 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error with an empty ref (unsigned)', async () => {
			options.uri = baseUrl + imagePath;
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
