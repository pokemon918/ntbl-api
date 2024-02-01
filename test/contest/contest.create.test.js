const expect = require('chai').expect;
const request = require('request-promise');
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];

const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	checkContestTeamData,
} = require('../common.js');

describe('Contest Team', () => {
	let options,
		path,
		contestTeamData,
		contestTeamResponse,
		createContestWithAvatar,
		createContestWithAvatarAsBase64,
		usedHandle;

	before(async () => {
		options = {...basePostOptions};
		// Create user1
		let createUserPath = baseUrl + '/user';
		let user1 = generateUserData();
		let response = await createItem(createUserPath, user1);

		// Simulate login
		await login(user1.email, user1.rawPass);

		createContestWithAvatar = async () => {
			let filePath = np.join(__dirname, './assets/valid/pic.jpg');
			let fileName = np.basename(filePath);
			let type = mime.contentType(fileName);
			let file = fs.createReadStream(filePath);

			/*
				Encountered: source.on is not a function error.
				https://github.com/request/request/issues/2366
				Solution: https://github.com/request/request/issues/1495
			*/

			let uploadOptions = {
				method: 'POST',
				uri: signPath('/contest/new', 'POST'),
				formData: {
					name: makeUniqueString(),
					description: makeUniqueString(),
					avatar: {
						value: file,
						options: {
							filename: fileName,
							contentType: type,
						},
					},
					'alias[admin]': 'alias_admin',
					'alias[leader]': 'alias_leader',
					'alias[guide]': 'alias_guide',
					'alias[member]': 'alias_member',
					'alias[collection]': 'alias_collection',
					'alias[theme]': 'alias_theme',
				},
				headers: {
					'content-type': 'multipart/form-data',
				},
			};
			let response = await request(uploadOptions);
			let contest = JSON.parse(response);
			return contest;
		};

		createContestWithAvatarAsBase64 = async (preData = null) => {
			let filePath = np.join(__dirname, './assets/valid/pic.jpg');
			let base64Img = fs.readFileSync(filePath, 'base64');

			options.body['avatar'] = base64Img;

			if (preData) {
				options.body['avatar'] = preData + base64Img;
			}

			let contest = await request(options);
			return contest;
		};
	});

	describe('Create', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				handle: makeUniqueString(),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			options.uri = signPath('/contest/new', 'POST');
		});

		/* Positive tests */
		it('should return correct status code', async () => {
			await checkStatusCodeByOptions(options, 201);
		});

		it('should return proper data', async () => {
			let response = await request(options);
			usedHandle = response.data.handle;
			checkContestTeamData(response.data, 'admin');
			expect(response.data.name).to.equal(options.body.name);
			expect(response.data.description).to.equal(options.body.description);
			expect(response.data.handle).to.equal(options.body.handle);
			expect(response.data.alias.admin).to.equal(options.body.alias.admin);
			expect(response.data.alias.leader).to.equal(options.body.alias.leader);
			expect(response.data.alias.guide).to.equal(options.body.alias.guide);
			expect(response.data.alias.member).to.equal(options.body.alias.member);
			expect(response.data.alias.collection).to.equal(options.body.alias.collection);
			expect(response.data.alias.theme).to.equal(options.body.alias.theme);
			expect(response.data.type).to.equal('contest');
		});

		it('should be able to upload a profile pic', async () => {
			let contest = await createContestWithAvatar();
			checkContestTeamData(contest.data, 'admin');
			expect(contest.data.type).to.equal('contest');
		});

		it('should be able to save a profile pic as base64 format', async () => {
			let contest = await createContestWithAvatarAsBase64();
			checkContestTeamData(contest.data, 'admin');
			expect(contest.data.type).to.equal('contest');
		});

		it('should be able to save a profile pic as base64 format even if it includes "data:image/png;base64," text in the string', async () => {
			let contest = await createContestWithAvatarAsBase64('data:image/png;base64,');
			checkContestTeamData(contest.data, 'admin');
			expect(contest.data.type).to.equal('contest');
		});

		it('should have a random handle when not included in the payload', async () => {
			delete options.body.handle;
			let response = await request(options);
			checkContestTeamData(response.data, 'admin');
			expect(response.data.type).to.equal('contest');
			expect(response.data.handle.length).to.be.at.least(6);
		});

		it('should return a random handle if [handle] is present and already taken', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				handle: usedHandle,
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			let contest = await request(options);
			checkContestTeamData(contest.data, 'admin');
		});

		it('should update the avatar [upload file] if it was not included upon creation', async () => {
			// Create a contest first, but don't include the profile_pic
			let response = await request(options);
			let contestRef = response.data.ref;
			checkContestTeamData(response.data, 'admin');
			expect(response.data.type).to.equal('contest');

			// Get contest data through team/[ref] to get the valud of avatar; It should be null before updating
			let getTeamOptions = {
				method: 'GET',
				uri: signPath(`/team/${contestRef}`, 'GET'),
			};
			response = await request(getTeamOptions);
			let contest = JSON.parse(response);
			expect(contest.avatar).to.equal(null);

			// Now update the avatar through upload file
			let filePath = np.join(__dirname, './assets/valid/pic.jpg');
			let fileName = np.basename(filePath);
			let type = mime.contentType(fileName);
			let file = fs.createReadStream(filePath);

			let uploadOptions = {
				method: 'POST',
				uri: signPath(`/team/${contestRef}`, 'POST'),
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

			response = await request(uploadOptions);
			contest = JSON.parse(response);
			expect(contest.data.type).to.equal('contest');

			// The avatar should now have a ref value after updating
			expect(contest.data.avatar).to.not.equal(null);
		});

		it('should update the avatar [base64] if it was not included upon creation', async () => {
			// Create a contest first, but don't include the avatar
			let response = await request(options);
			let contestRef = response.data.ref;
			checkContestTeamData(response.data, 'admin');
			expect(response.data.type).to.equal('contest');

			// Get contest data through team/[ref] to get the valud of avatar; It should be null before updating
			let getTeamOptions = {
				method: 'GET',
				uri: signPath(`/team/${contestRef}`, 'GET'),
			};
			response = await request(getTeamOptions);
			let contest = JSON.parse(response);
			expect(contest.avatar).to.equal(null);

			// Now update the avatar through upload file
			let filePath = np.join(__dirname, './assets/valid/pic.jpg');
			let base64Img = fs.readFileSync(filePath, 'base64');
			options.body['avatar'] = 'data:image/png;base64,' + base64Img;
			options.uri = signPath(`/team/${contestRef}`, 'POST');
			response = await request(options);
			contest = response.data;
			expect(contest.type).to.equal('contest');

			// The avatar should now have a ref value after updating
			expect(contest.avatar).to.not.equal(null);
		});

		it('should update the avatar [upload file] if it was created prior', async () => {
			// Create a contest first, but don't include the avatar
			let response = await createContestWithAvatar();
			let contestRef = response.data.ref;

			// Get contest data through team/[ref] to get the valud of avatar; It should be null before updating
			let getTeamOptions = {
				method: 'GET',
				uri: signPath(`/team/${contestRef}`, 'GET'),
			};
			response = await request(getTeamOptions);
			let contest = JSON.parse(response);
			let initialAvatar = contest.avatar;

			// The contest should already have a avatar at this point
			expect(initialAvatar).to.not.equal(null);

			// Now update the avatar through upload file
			let filePath = np.join(__dirname, './assets/valid/pic.jpg');
			let fileName = np.basename(filePath);
			let type = mime.contentType(fileName);
			let file = fs.createReadStream(filePath);

			let uploadOptions = {
				method: 'POST',
				uri: signPath(`/team/${contestRef}`, 'POST'),
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

			response = await request(uploadOptions);
			contest = JSON.parse(response);
			expect(contest.data.type).to.equal('contest');
			let updatedAvatar = contest.data.avatar;

			// The updatedAvatar should not be the same as the initialAvatar since it was already updated
			expect(updatedAvatar).to.not.equal(initialAvatar);
		});

		it('should update the avatar [base64] if it was created prior', async () => {
			// Create a contest first, but don't include the avatar
			let response = await createContestWithAvatarAsBase64();
			let contestRef = response.data.ref;

			// Get contest data through team/[ref] to get the valud of avatar; It should be null before updating
			let getTeamOptions = {
				method: 'GET',
				uri: signPath(`/team/${contestRef}`, 'GET'),
			};
			response = await request(getTeamOptions);
			let contest = JSON.parse(response);
			let initialAvatar = contest.avatar;

			// The contest should already have a avatar at this point
			expect(initialAvatar).to.not.equal(null);

			// Now update the avatar through upload file
			let filePath = np.join(__dirname, './assets/valid/pic.jpg');
			let base64Img = fs.readFileSync(filePath, 'base64');
			options.body['avatar'] = 'data:image/png;base64,' + base64Img;
			options.uri = signPath(`/team/${contestRef}`, 'POST');
			response = await request(options);
			contest = response.data;
			expect(contest.type).to.equal('contest');
			let updatedAvatar = contest.avatar;

			// The updatedAvatar should not be the same as the initialAvatar since it was already updated
			expect(updatedAvatar).to.not.equal(initialAvatar);
		});

		it('should save the correct image', async () => {
			// Create a contest first, but don't include the avatar
			let response = await createContestWithAvatarAsBase64();
			let contestRef = response.data.ref;

			// Get contest data through team/[ref] to get the valud of avatar; It should be null before updating
			let getTeamOptions = {
				method: 'GET',
				uri: signPath(`/team/${contestRef}`, 'GET'),
			};
			response = await request(getTeamOptions);
			let contest = JSON.parse(response);
			let avatarRef = contest.avatar;

			// // Fetch the image
			let imagePath = signPath(`/images/${avatarRef}`, 'GET');
			let getImageOptions = {
				method: 'GET',
				uri: imagePath + '&base64=true',
			};
			let avatarAsBase64 = await request(getImageOptions);
			let filePath = np.join(__dirname, './assets/valid/pic.jpg');
			let diffImgFilePath = np.join(__dirname, './assets/invalid/wine.gif');
			let originalImgAsBase64 = fs.readFileSync(filePath, 'base64');
			let differentImgAsBase64 = fs.readFileSync(diffImgFilePath, 'base64');

			// The returned profile pic (in base64) must be the same as the original image (in base64)
			expect(avatarAsBase64).to.equal(originalImgAsBase64);

			// Now try to compare it to a different image, they should not be the same
			expect(avatarAsBase64).to.not.equal(differentImgAsBase64);
		});

		/* Negative tests */
		it('should return an error if payload is null', async () => {
			options.body = null;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload is empty', async () => {
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if name is missing in payload', async () => {
			options.body = {
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
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if name is null', async () => {
			options.body = {
				name: null,
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
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if name is empty', async () => {
			options.body = {
				name: '',
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
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if name exceeds max length of 255', async () => {
			options.body = {
				name: 'a'.repeat(255 + 1),
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
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if description exceeds max length of 4000', async () => {
			options.body = {
				name: makeUniqueString(),
				description: 'a'.repeat(4000 + 1),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if ["handle"] is present and empty', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				handle: '',
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if ["handle"] is present and exceeds max length of 255', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				handle: makeUniqueString(256),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(65),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["admin"] is missing', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["admin"] is null', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: null,
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["admin"] is empty', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: '',
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["admin"] exceeds max length of 64', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(65),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["leader"] is missing', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["leader"] is null', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: null,
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["leader"] is empty', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: '',
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["leader"] exceeds max length of 64', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(65),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["guide"] is missing', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["guide"] is null', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: null,
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["guide"] is empty', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: '',
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["guide"] exceeds max length of 64', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(65),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["member"] is missing', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["member"] is null', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: null,
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["member"] is empty', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: '',
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["member"] exceeds max length of 64', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(65),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["collection"] is missing', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["collection"] is null', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: null,
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["collection"] is empty', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: '',
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["collection"] exceeds max length of 64', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(65),
					theme: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["theme"] is missing', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["theme"] is null', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: null,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["theme"] is empty', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: '',
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if alias["theme"] exceeds max length of 64', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(65),
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

				var uploadOptions = {
					method: 'POST',
					uri: signPath('/team', 'POST'),
					formData: {
						name: makeUniqueString(),
						handle: makeUniqueString(),
						description: makeUniqueString(),
						city: makeUniqueString(),
						country: 'DK',
						visibility: 'open',
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

		it('should return error if [avatar] is [int] when sending it as a base64 image', async () => {
			options.body['avatar'] = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if [avatar] is [array] when sending it as a base64 image', async () => {
			options.body['avatar'] = [1, 2, 3];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if [avatar] is [object] when sending it as a base64 image', async () => {
			options.body['avatar'] = {field: 'value'};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if [avatar] is [float] when sending it as a base64 image', async () => {
			options.body['avatar'] = 5.4;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if [avatar] is not a valid base64 string when sending it as a base64 image', async () => {
			options.body['avatar'] = makeUniqueString(10);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if [avatar] does not have a valid mime_type when sending it as a base64 image', async () => {
			for (const ext of invalidFileExts) {
				let filePath = np.join(__dirname, './assets/invalid/wine' + ext);
				let base64Img = fs.readFileSync(filePath, 'base64');
				options.uri = signPath('/contest/new', 'POST');
				options.body['avatar'] = base64Img;
				await checkStatusCodeByOptions(options, 400);
			}
		});
	});
});
