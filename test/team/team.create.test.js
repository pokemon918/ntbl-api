const expect = require('chai').expect;
const request = require('request-promise');
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];
const {
	baseUrl,
	baseGetOptions,
	createItem,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	checkCreateStatusCode,
	checkStatusCodeByOptions,
	login,
	signPath,
} = require('../common.js');

describe('Team', () => {
	let options, path, teamData, teamResponse, checkProperData;

	before(async () => {
		options = {...baseGetOptions};
		// Create user1
		let createUserPath = baseUrl + '/user';
		let user1 = generateUserData();
		let response = await createItem(createUserPath, user1);

		// Simulate login
		await login(user1.email, user1.rawPass);

		// Create a team for user1
		teamData = {
			handle: makeUniqueString(),
			name: makeUniqueString(),
			description: makeUniqueString(),
			city: makeUniqueString(),
			country: 'DK',
			visibility: 'public',
		};

		path = signPath('/team', 'POST');
		teamResponse = await createItem(path, teamData);

		checkProperData = (baseEvent, event) => {
			// Check for property existence
			expect(event).to.not.have.property('id');
			expect(event).to.have.property('ref');
			expect(event).to.have.property('name');
			expect(event).to.have.property('handle');
			expect(event).to.have.property('type');
			expect(event).to.have.property('description');
			expect(event).to.have.property('city');
			expect(event).to.have.property('country');
			expect(event).to.have.property('visibility');
			expect(event).to.have.property('access');
			expect(event).to.have.property('userRelations');
			expect(event).to.have.property('avatar');
			expect(event).to.have.property('created_at');
			expect(event).to.have.property('updated_at');

			// Check for correct data type
			expect(event.ref).to.be.a('string');
			expect(event.name).to.be.a('string');
			expect(event.handle).to.be.a('string');
			expect(event.type).to.be.a('string');
			expect(event.description).to.be.a('string');
			expect(event.visibility).to.be.a('string');
			expect(event.access).to.be.a('string');
			expect(event.userRelations).to.be.a('array');
			expect(event.created_at).to.be.a.dateString();
			expect(event.updated_at).to.be.a.dateString();

			expect(event.type).to.equal('traditional');
		};
	});

	describe('Create', () => {
		beforeEach(async () => {
			options.transform = null;
			path = signPath('/team', 'POST');
		});

		/* Positive tests */
		it('should return correct status code', async () => {
			let data = {
				handle: makeUniqueString(),
				name: makeUniqueString(),
				description: makeUniqueString(),
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'public',
			};
			let response = await createItem(path, data, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should return proper data', async () => {
			let data = {
				handle: makeUniqueString(),
				name: makeUniqueString(),
				description: makeUniqueString(),
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'public',
			};
			let response = await createItem(path, data);
			checkProperData(teamData, response.data);
		});

		it('should be successful', async () => {
			checkForSuccess(teamResponse);
		});

		it('should be successful even with [trimmable] characters in fields', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
				description: makeUniqueString(),
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'private',
			};
			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should be able to upload/update a profile pic', async () => {
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: path,
				formData: {
					name: makeUniqueString(),
					handle: makeUniqueString(),
					description: makeUniqueString(),
					city: makeUniqueString(),
					country: 'DK',
					visibility: 'public',
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

		it('should default the [visibility] to private', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
			};
			let response = await createItem(path, data);
			checkForSuccess(response);
			expect(response.data.visibility).to.equal('private');
		});

		it('should be successful when [visibility] is set to private', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
				visibility: 'private',
			};
			let response = await createItem(path, data);
			checkForSuccess(response);
			expect(response.data.visibility).to.equal('private');
		});

		it('should be successful when [visibility] is set to hidden', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
				visibility: 'hidden',
			};
			let response = await createItem(path, data);
			checkForSuccess(response);
			expect(response.data.visibility).to.equal('hidden');
		});

		it('should be successful when [visibility] is set to public', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
				visibility: 'public',
			};
			let response = await createItem(path, data);
			checkForSuccess(response);
			expect(response.data.visibility).to.equal('public');
		});

		it('should default the [access] to apply', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
			};
			let response = await createItem(path, data);
			checkForSuccess(response);
			expect(response.data.access).to.equal('apply');
		});

		it('should be successful when [access] is set to apply', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
				access: 'apply',
			};
			let response = await createItem(path, data);
			checkForSuccess(response);
			expect(response.data.access).to.equal('apply');
		});

		it('should be successful when [access] is set to open', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
				access: 'open',
			};
			let response = await createItem(path, data);
			checkForSuccess(response);
			expect(response.data.access).to.equal('open');
		});

		it('should be successful when [access] is set to exclusive', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
				access: 'exclusive',
			};
			let response = await createItem(path, data);
			checkForSuccess(response);
			expect(response.data.access).to.equal('exclusive');
		});

		/* Negative tests */
		it('should return an error if payload is null', async () => {
			let data = null;
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if payload is empty', async () => {
			let data = {};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if name is missing in payload', async () => {
			let data = {
				description: makeUniqueString(),
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'public',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if handle is empty or missing', async () => {
			let data = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'public',
			};
			let path = signPath('/team/' + makeUniqueString(), 'POST');
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if name exceeds max length of 255', async () => {
			let data = {
				name: 'a'.repeat(255 + 1),
				description: makeUniqueString(),
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'public',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if description exceeds max length of 4000', async () => {
			let data = {
				name: makeUniqueString(),
				description: 'a'.repeat(4000 + 1),
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'public',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if city exceeds max length of 255', async () => {
			let data = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				city: 'a'.repeat(255 + 1),
				country: 'DK',
				visibility: 'public',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if country exceeds max length of 2', async () => {
			let data = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				city: makeUniqueString(),
				country: 'a'.repeat(2 + 1),
				visibility: 'public',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if country is not a valid ISO alpha-2', async () => {
			let data = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				city: makeUniqueString(),
				country: '!'.repeat(1),
				visibility: 'public',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if handle exceeds max length of 255', async () => {
			let data = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'public',
			};
			let newHandle = 'a'.repeat(255 + 1);
			let path = signPath('/team/' + newHandle, 'POST');
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if handle is not unique', async () => {
			let duplicateHandle = makeUniqueString();

			let team1data = {
				handle: duplicateHandle,
				name: makeUniqueString(),
				description: 'team 1 description',
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'public',
			};
			path = signPath('/team', 'POST');
			await createItem(path, team1data, true);

			let team2data = {
				handle: duplicateHandle,
				name: makeUniqueString(),
				description: 'team 2 description',
				city: makeUniqueString(),
				country: 'DK',
				visibility: 'public',
			};
			path = signPath('/team', 'POST');
			await checkCreateStatusCode(path, team2data, 400);
		});

		it('should fail when uploading invalid file extensions', async () => {
			for (const ext of invalidFileExts) {
				var filePath = np.join(__dirname, './assets/invalid/wine' + ext);
				var fileName = np.basename(filePath);
				var type = mime.contentType(fileName);
				var file = fs.createReadStream(filePath);

				var uploadOptions = {
					method: 'POST',
					uri: signPath('/team', 'POST'),
					formData: {
						name: makeUniqueString(),
						handle: makeUniqueString(),
						description: makeUniqueString(),
						city: makeUniqueString(),
						country: 'DK',
						visibility: 'public',
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

		it('should return error if [visibility] is invalid', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
				visibility: makeUniqueString(),
			};
			// let response = await createItem(path, data);
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return error if [access] is invalid', async () => {
			let data = {
				handle: makeUniqueString(),
				name: '\ntest name\n',
				access: makeUniqueString(),
			};
			// let response = await createItem(path, data);
			await checkCreateStatusCode(path, data, 400);
		});
	});
});
