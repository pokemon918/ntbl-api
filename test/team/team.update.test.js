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
	getItem,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	checkCreateStatusCode,
	checkStatusCodeByOptions,
	login,
	signPath,
	likeOrFollowTeam,
} = require('../common.js');

describe('Team', () => {
	let options,
		path,
		updatePath,
		updateTeamData,
		teamResponse,
		creator,
		admin,
		editor,
		member,
		liker,
		follower,
		notRelatedUser,
		avatar,
		compareOriginalToUpdatedData,
		checkUpdatedData;

	before(async () => {
		options = {...baseGetOptions};
		let createUserPath = baseUrl + '/user';

		// Create team creator
		creator = generateUserData();
		let creatorData = await createItem(createUserPath, creator);

		// Create team admin
		admin = generateUserData();
		let adminData = await createItem(createUserPath, admin);

		// Create team editor
		editor = generateUserData();
		let editorData = await createItem(createUserPath, editor);

		// Create team member
		member = generateUserData();
		let memberData = await createItem(createUserPath, member);

		// Create team member
		liker = generateUserData();
		let likerData = await createItem(createUserPath, liker);

		// Create team member
		follower = generateUserData();
		let followerData = await createItem(createUserPath, follower);

		// Create a user that is not related to the team in any way
		notRelatedUser = generateUserData();
		let notRelatedUserData = await createItem(createUserPath, notRelatedUser);

		// Simulate login the team creator
		await login(creator.email, creator.rawPass);

		// Create a team data
		let createTeamData = {
			name: makeUniqueString(),
			handle: makeUniqueString(),
			description: 'team description',
			city: makeUniqueString(),
			country: 'US',
			visibility: 'public',
		};

		path = signPath('/team', 'POST');
		teamResponse = await createItem(path, createTeamData);

		let addRelationPath = `/team/${teamResponse.data.ref}/user`;

		// Add admin to team1
		await createItem(signPath(addRelationPath + '/' + adminData.data.ref, 'POST'), {
			relation: ['admin'],
		});

		// Add editor to team1
		await createItem(signPath(addRelationPath + '/' + editorData.data.ref, 'POST'), {
			relation: ['editor'],
		});

		// Add member to team1
		await createItem(signPath(addRelationPath + '/' + memberData.data.ref, 'POST'), {
			relation: ['member'],
		});

		// Update team data
		updateTeamData = {
			name: makeUniqueString(),
			handle: makeUniqueString(),
			description: 'team description',
			city: makeUniqueString(),
			country: 'DK',
		};

		compareOriginalToUpdatedData = (originalData, updatedData, updatedProp) => {
			// The updatedProp should not be equal to the original data, while the rest of the fields should stay the same

			Object.keys(originalData).forEach((prop) => {
				// do not check for updated_at cause it's going to change constantly
				if (prop == 'updated_at') {
					return;
				}

				if (prop == updatedProp) {
					if (prop == 'userRelations') {
						expect(originalData[prop]).to.deep.equal(updatedData[prop]);
						return;
					}

					expect(originalData[prop]).to.not.equal(updatedData[prop]);
					return;
				}

				if (prop == 'userRelations') {
					expect(originalData[prop]).to.deep.equal(updatedData[prop]);
					return;
				}

				expect(originalData[prop]).to.equal(updatedData[prop]);
			});
		}; //end of compareOriginalToUpdatedData

		checkUpdatedData = (updateResponseData, getResponsData) => {
			// The props of both objects must all be equal

			Object.keys(updateResponseData).forEach((prop) => {
				if (prop == 'userRelations') {
					expect(updateResponseData[prop]).to.deep.equal(getResponsData[prop]);
					return;
				}
				expect(updateResponseData[prop]).to.equal(getResponsData[prop]);
			});
		}; //end of checkUpdatedData
	});

	describe('Update', () => {
		beforeEach(async () => {
			options.transform = null;
		});

		/* Positive tests */
		it('should return correct status code', async () => {
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, updateTeamData, true);
			expect(response.statusCode).to.equal(200);
		});

		it('should be successful', async () => {
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, updateTeamData);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should update the fields in DB', async () => {
			//Update the data
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, updateTeamData);
			checkForSuccess(response);

			//Get the data from API by ref
			let getPath = signPath('/team/' + teamResponse.data.ref, 'GET');
			let updatedTeam = await getItem(getPath);

			// The response from the update must be equal with the response from get by ref
			checkUpdatedData(response.data, updatedTeam);
			teamResponse.data = response.data;
		});

		it('should be successful even with [trimmable] characters in fields', async () => {
			let data = {
				handle: makeUniqueString(),
				description: '\nteam description\n',
				city: makeUniqueString(),
				country: 'DK',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when updating the [name] without affecting other fields', async () => {
			let data = {
				name: makeUniqueString(),
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			compareOriginalToUpdatedData(teamResponse.data, response.data, 'name');
			teamResponse.data = response.data;
		});

		it('should be successful when updating the [handle] without affecting other fields', async () => {
			let data = {
				handle: makeUniqueString(),
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			compareOriginalToUpdatedData(teamResponse.data, response.data, 'handle');
			teamResponse.data = response.data;
		});

		it('should be successful when updating [city] without affecting other fields', async () => {
			let data = {
				city: makeUniqueString(),
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			compareOriginalToUpdatedData(teamResponse.data, response.data, 'city');
			teamResponse.data = response.data;
		});

		it('should be successful when updating [country] without affecting other fields', async () => {
			let data = {
				country: 'BR',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			compareOriginalToUpdatedData(teamResponse.data, response.data, 'country');
			teamResponse.data = response.data;
		});

		it('should be successful when updating [description] without affecting other fields', async () => {
			let data = {
				description: makeUniqueString(100),
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			compareOriginalToUpdatedData(teamResponse.data, response.data, 'description');
			teamResponse.data = response.data;
		});

		it('should be successful when updating [visibility] without affecting other fields', async () => {
			let data = {
				visibility: 'hidden',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			compareOriginalToUpdatedData(teamResponse.data, response.data, 'visibility');
			teamResponse.data = response.data;
		});

		it('should be successful when updating [visibility] to hidden', async () => {
			let data = {
				visibility: 'hidden',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			expect(response.data.visibility).to.equal('hidden');
		});

		it('should be successful when updating [visibility] to public', async () => {
			let data = {
				visibility: 'public',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			expect(response.data.visibility).to.equal('public');
		});

		it('should be successful when updating [visibility] to private', async () => {
			let data = {
				visibility: 'private',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			expect(response.data.visibility).to.equal('private');
		});

		it('should be successful when updating [access] without affecting other fields', async () => {
			let data = {
				access: 'open',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			expect(response.data.access).to.equal('open');
		});

		it('should be successful when updating [access] to open', async () => {
			let data = {
				access: 'open',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			expect(response.data.access).to.equal('open');
		});

		it('should be successful when updating [access] to apply', async () => {
			let data = {
				access: 'apply',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			expect(response.data.access).to.equal('apply');
		});

		it('should be successful when updating [access] to exclusive', async () => {
			let data = {
				access: 'exclusive',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			expect(response.data.access).to.equal('exclusive');
		});

		it('should be able to upload/update a profile pic', async () => {
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
				formData: {
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
			avatar = JSON.parse(response.body);
			avatar = avatar.data.avatar;
			expect(response.statusCode).to.equal(200);
			expect(avatar).to.be.a('string');
			expect(avatar).to.not.equal(null);
		});

		it('should be able to replace [profile pic] and old one should not be accessible', async () => {
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
				formData: {
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

			// Update Profile Pic
			let response = await request(uploadOptions);
			let oldAvatar = avatar;
			let newAvatar = JSON.parse(response.body);
			newAvatar = newAvatar.data.avatar;
			expect(response.statusCode).to.equal(200);
			expect(newAvatar).to.be.a('string');
			expect(newAvatar).to.not.equal(null);
			expect(newAvatar).to.not.equal(oldAvatar);

			// Check Old Profile Pic
			options.method = 'GET';
			options.uri = signPath('/images/' + oldAvatar, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be successful when [handle] is updated by an owner', async () => {
			//By default the creator is also the owner
			await login(creator.email, creator.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				handle: makeUniqueString(),
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [name] is updated by an owner', async () => {
			//By default the creator is also the owner
			await login(creator.email, creator.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				name: makeUniqueString(),
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [description] is updated by an owner', async () => {
			//By default the creator is also the owner
			await login(creator.email, creator.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				description: makeUniqueString(100),
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [visibility] is updated by an owner', async () => {
			//By default the creator is also the owner
			await login(creator.email, creator.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				visibility: 'public',
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [city] is updated by an owner', async () => {
			//By default the creator is also the owner
			await login(creator.email, creator.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				city: makeUniqueString(),
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
		});

		it('should be successful when [country] is updated by an owner', async () => {
			//By default the creator is also the owner
			await login(creator.email, creator.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				country: 'BR',
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
		});

		it('should be successful when [avatar] is updated by an owner', async () => {
			//By default the creator is also the owner
			await login(creator.email, creator.rawPass);
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
				formData: {
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
			avatar = JSON.parse(response.body);
			avatar = avatar.data.avatar;
			expect(response.statusCode).to.equal(200);
			expect(avatar).to.be.a('string');
			expect(avatar).to.not.equal(null);
		});

		it('should be successful when updating all fields by an owner', async () => {
			//By default the creator is also the owner
			await login(creator.email, creator.rawPass);
			updateTeamData.name = makeUniqueString();
			updateTeamData.handle = makeUniqueString();
			updateTeamData.description = makeUniqueString();
			updateTeamData.city = makeUniqueString();
			updateTeamData.country = 'BR';
			updateTeamData.visibility = 'hidden';
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, updateTeamData);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [handle] is updated by an admin', async () => {
			await login(admin.email, admin.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				handle: makeUniqueString(),
			};

			teamResponse.data.handle = data.handle;
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [name] is updated by an admin', async () => {
			await login(admin.email, admin.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				name: makeUniqueString(),
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [description] is updated by an admin', async () => {
			await login(admin.email, admin.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				description: makeUniqueString(100),
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [visibility] is updated by an admin', async () => {
			await login(admin.email, admin.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				visibility: 'public',
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [city] is updated by an admin', async () => {
			await login(admin.email, admin.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				city: makeUniqueString(),
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
		});

		it('should be successful when [country] is updated by an admin', async () => {
			await login(admin.email, admin.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				country: 'BR',
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
		});

		it('should be successful when [avatar] is updated by an admin', async () => {
			await login(admin.email, admin.rawPass);
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
				formData: {
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
			avatar = JSON.parse(response.body);
			avatar = avatar.data.avatar;
			expect(response.statusCode).to.equal(200);
			expect(avatar).to.be.a('string');
			expect(avatar).to.not.equal(null);
		});

		it('should be successful when updating all fields by an admin', async () => {
			await login(admin.email, admin.rawPass);
			updateTeamData.name = makeUniqueString();
			updateTeamData.handle = makeUniqueString();
			updateTeamData.description = makeUniqueString();
			updateTeamData.city = makeUniqueString();
			updateTeamData.country = 'BR';
			updateTeamData.visibility = 'hidden';
			teamResponse.data.handle = updateTeamData.handle;
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let response = await createItem(updatePath, updateTeamData);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		it('should be successful when [description] is updated by an editor', async () => {
			await login(editor.email, editor.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				description: makeUniqueString(100),
			};
			let response = await createItem(updatePath, data);
			checkForSuccess(response);
			teamResponse.data = response.data;
		});

		/* Negative tests */
		it('should return an error if payload is null', async () => {
			await login(admin.email, admin.rawPass);
			let data = null;
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if payload is empty', async () => {
			await login(admin.email, admin.rawPass);
			let data = {};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] was already taken', async () => {
			await login(admin.email, admin.rawPass);

			let otherTeamData = {
				name: makeUniqueString(),
				handle: makeUniqueString(),
				description: 'team description',
				visibility: 'public',
			};

			let createPath = signPath('/team', 'POST');
			let otherTeamResponse = await createItem(createPath, otherTeamData);

			let updatePath = signPath('/team/' + otherTeamResponse.data.ref, 'POST');
			let data = {
				handle: teamResponse.data.handle,
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [name] is sent as a numeric value', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				name: 1234,
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [name] is sent as an array', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				name: [],
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [name] is sent as an object', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				name: {},
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [name] exceeded max length of [255]', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				name: makeUniqueString(256),
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] is sent as a numeric value', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				handle: 1234,
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] is sent as an array', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				handle: [],
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] is sent as an object', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				handle: {},
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] exceeded max length of [255]', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				handle: makeUniqueString(256),
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] does not have a valid handle format', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				handle: '$@#!@#%',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [description] is sent as a numeric value', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				description: 1234,
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [description] is sent as an array', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				description: [],
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [description] is sent as an object', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				description: {},
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [description] exceeded max length of [4000]', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				description: makeUniqueString(4001),
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [city] is sent as a numeric value', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				city: 1234,
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [city] is sent as an array', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				city: [],
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [city] is sent as an object', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				city: {},
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [city] exceeded max length of [255]', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				city: makeUniqueString(256),
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] is sent as a numeric value', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				country: 12,
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] is sent as an array', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				country: [],
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] is sent as an object', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				country: {},
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] exceeded max length of [2]', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				country: makeUniqueString(3),
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] does not exists from DB', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				country: '!a',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [visibility] is sent as a numeric value', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				visibility: 1234,
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [visibility] is sent as an array', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				visibility: [],
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [visibility] is sent as an object', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				visibility: {},
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [visibility] does not exists from DB', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				visibility: 'non-existing-visibility',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [access] is sent as a numeric value', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				access: 1234,
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [access] is sent as an array', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				access: [],
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [access] is sent as an object', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				access: {},
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [access] does not exists from DB', async () => {
			await login(admin.email, admin.rawPass);
			let data = {
				access: 'non-existing-access',
			};
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [name] is updated by a [editor]', async () => {
			await login(editor.email, editor.rawPass);

			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				name: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] is updated by a [editor]', async () => {
			await login(editor.email, editor.rawPass);

			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				handle: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [visibility] is updated by a [editor]', async () => {
			await login(editor.email, editor.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				visibility: 'public',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [city] is updated by a [editor]', async () => {
			await login(editor.email, editor.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				city: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] is updated by a [editor]', async () => {
			await login(editor.email, editor.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				country: 'BR',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [avatar] is updated by an editor', async () => {
			await login(editor.email, editor.rawPass);
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
				formData: {
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
		});

		it('should return an error if [name] is updated by a [member]', async () => {
			await login(member.email, member.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				name: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] is updated by a [member]', async () => {
			await login(member.email, member.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				handle: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [description] is updated by a [member]', async () => {
			await login(member.email, member.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				description: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [visibility] is updated by a [member]', async () => {
			await login(member.email, member.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				visibility: 'public',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [city] is updated by a [editor]', async () => {
			await login(member.email, member.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				city: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] is updated by a [editor]', async () => {
			await login(member.email, member.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				country: 'BR',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [avatar] is updated by an member', async () => {
			await login(member.email, member.rawPass);
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
				formData: {
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
		});

		it('should return an error if [name] is updated by a [liker]', async () => {
			// Login the liker
			await login(liker.email, liker.rawPass);

			// like the team
			const likerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['like'],
				},
				transform: null,
			};
			await request(likerOptions);

			// liker updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				name: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [description] is updated by a [liker]', async () => {
			// Login the liker
			await login(liker.email, liker.rawPass);

			// like the team
			const likerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['like'],
				},
				transform: null,
			};
			await request(likerOptions);

			// liker updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				description: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] is updated by a [liker]', async () => {
			// Login the liker
			await login(liker.email, liker.rawPass);

			// like the team
			const likerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['like'],
				},
				transform: null,
			};
			await request(likerOptions);

			// liker updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				handle: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [visibility] is updated by a [liker]', async () => {
			// Login the liker
			await login(liker.email, liker.rawPass);

			// like the team
			const likerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['like'],
				},
				transform: null,
			};
			await request(likerOptions);

			// liker updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				visibility: 'public',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [city] is updated by a [liker]', async () => {
			// Login the liker
			await login(liker.email, liker.rawPass);

			// like the team
			const likerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['like'],
				},
				transform: null,
			};
			await request(likerOptions);

			// liker updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				city: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] is updated by a [liker]', async () => {
			// Login the liker
			await login(liker.email, liker.rawPass);

			// like the team
			const likerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['like'],
				},
				transform: null,
			};
			await request(likerOptions);

			// liker updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				country: 'BR',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [avatar] is updated by a [liker]', async () => {
			await login(liker.email, liker.rawPass);

			// like the team
			const likerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['like'],
				},
				transform: null,
			};
			await request(likerOptions);

			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
				formData: {
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
		});

		it('should return an error if [name] is updated by a [follower]', async () => {
			// Login the follower
			await login(follower.email, follower.rawPass);

			// follow the team
			const followerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['follow'],
				},
				transform: null,
			};

			await request(followerOptions);

			// follower updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				name: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [description] is updated by a [follower]', async () => {
			// Login the follower
			await login(follower.email, follower.rawPass);

			// follow the team
			const followerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['follow'],
				},
				transform: null,
			};

			await request(followerOptions);

			// follower updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				description: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] is updated by a [follower]', async () => {
			// Login the follower
			await login(follower.email, follower.rawPass);

			// follow the team
			const followerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['follow'],
				},
				transform: null,
			};

			await request(followerOptions);

			// follower updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				handle: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [visibility] is updated by a [follower]', async () => {
			// Login the follower
			await login(follower.email, follower.rawPass);

			// follow the team
			const followerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['follow'],
				},
				transform: null,
			};

			await request(followerOptions);

			// follower updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				visibility: 'public',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [city] is updated by a [follower]', async () => {
			// Login the follower
			await login(follower.email, follower.rawPass);

			// follow the team
			const followerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['follow'],
				},
				transform: null,
			};

			await request(followerOptions);

			// follower updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				city: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] is updated by a [follower]', async () => {
			// Login the follower
			await login(follower.email, follower.rawPass);

			// follow the team
			const followerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['follow'],
				},
				transform: null,
			};

			await request(followerOptions);

			// follower updates the team
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				country: 'BR',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [avatar] is updated by a [follower]', async () => {
			await login(follower.email, follower.rawPass);

			// like the team
			const followerOptions = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamResponse.data.ref}`, 'POST'),
				body: {
					relation: ['like'],
				},
				transform: null,
			};
			await request(followerOptions);

			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
				formData: {
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
		});

		it('should return an error if [name] is updated by a user that is not related to the team [notRelatedUser]', async () => {
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				name: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [handle] is updated by a user that is not related to the team [notRelatedUser]', async () => {
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				handle: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [description] is updated by a user that is not related to the team [notRelatedUser]', async () => {
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				description: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [visibility] is updated by a user that is not related to the team [notRelatedUser]', async () => {
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				visibility: 'public',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [city] is updated by a user that is not related to the team [notRelatedUser]', async () => {
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				city: makeUniqueString(),
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [country] is updated by a user that is not related to the team [notRelatedUser]', async () => {
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			let updatePath = signPath('/team/' + teamResponse.data.ref, 'POST');
			let data = {
				country: 'BR',
			};
			await checkCreateStatusCode(updatePath, data, 400);
		});

		it('should return an error if [avatar] is updated by a user that is not related to the team [notRelatedUser]', async () => {
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			var filePath = np.join(__dirname, './assets/valid/pic.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			var uploadOptions = {
				method: 'POST',
				uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
				formData: {
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
		});

		it('should fail when uploading invalid file extensions', async () => {
			for (const ext of invalidFileExts) {
				var filePath = np.join(__dirname, './assets/invalid/wine' + ext);
				var fileName = np.basename(filePath);
				var type = mime.contentType(fileName);
				var file = fs.createReadStream(filePath);

				var uploadOptions = {
					method: 'POST',
					uri: signPath('/team/' + teamResponse.data.ref, 'POST'),
					formData: {
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
