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
	generateUserData,
	makeUniqueString,
	login,
	signPath,
	createContest,
	createContestDivision,
	createContestCollection,
	createContestParticipant,
	createDivisionMemberWithRole,
} = require('../common.js');

const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];

describe('Contest', () => {
	let options,
		user,
		anotherUser,
		userData,
		anotherUserData,
		contest,
		division,
		anotherUserContest,
		contestCollection,
		anotherUserContestCollection,
		participant,
		admin,
		leader,
		guide,
		member;

	before(async () => {
		options = {...basePostOptions};

		// Create users
		user = generateUserData();
		let createUserPath = baseUrl + '/user';
		userData = await createItem(createUserPath, user);

		anotherUser = generateUserData();
		anotherUserData = await createItem(createUserPath, anotherUser);

		// Simulate login for user1
		await login(user.email, user.rawPass);

		// Create a contest
		contest = await createContest();

		// Create Division
		division = await createContestDivision(contest.data.ref);

		// Add a contest collection
		contestCollection = await createContestCollection(contest.data.ref);

		await login(anotherUser.email, anotherUser.rawPass);

		// Add a contest for another user
		anotherUserContest = await createContest();

		// Add a contest collection for another user
		anotherUserContestCollection = await createContestCollection(anotherUserContest.data.ref);

		// Create a contest participant for testing
		participant = await createContestParticipant(user, contest.data.ref, 'participant');

		// Create a contest admin for testing
		admin = await createContestParticipant(user, contest.data.ref, 'admin');

		// Create a contest leader for testing
		leader = await createDivisionMemberWithRole(user, contest, division, 'leader');

		// Create a contest guide for testing
		guide = await createDivisionMemberWithRole(user, contest, division, 'guide');

		// Create a contest member for testing
		member = await createDivisionMemberWithRole(user, contest, division, 'member');
	});

	describe('Import My Contest Impressions', () => {
		beforeEach(async () => {
			// login the default user before each test by default
			await login(user.email, user.rawPass);
			options.transform = null;
			options.uri = signPath(
				`/contest/${contest.data.ref}/collection/${contestCollection.ref}/import/impressions`,
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
				`/admin/contest/${contest.data.ref}/collection/${nonExistingCollectionRef}/import/impressions`,
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

				options.uri = signPath(
					`/contest/${contest.data.ref}/collection/${contestCollection.ref}/import/impressions`,
					'POST'
				);
				await checkStatusCodeByOptions(options, 400);
			}
		});

		it('should return an error if the contest does not belong to the current user', async () => {
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

			options.uri = signPath(
				`/contest/${anotherUserContest.data.ref}/collection/${contestCollection.ref}/import/impressions`,
				'POST'
			);

			// The API should return an error since anotherUserContest was created by anotherUser
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the collection does not belong to the current user', async () => {
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

			options.uri = signPath(
				`/contest/${contest.data.ref}/collection/${anotherUserContestCollection.ref}/import/impressions`,
				'POST'
			);

			// The API should return an error since anotherUserContestCollection was created by anotherUser
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if contest [admin] tries to import the contest impressions', async () => {
			// Login the admin
			await login(admin.email, admin.rawPass);

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

			options.uri = signPath(
				`/contest/${contest.data.ref}/collection/${contestCollection.ref}/import/impressions`,
				'POST'
			);

			// Only the contest owner has the authority to import contest impressions. Testing for [admin]
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if contest [participant] tries to import the contest impressions', async () => {
			// Only the contest owner has the authority to import contest impressions

			// Login the participant
			await login(participant.email, participant.rawPass);

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

			options.uri = signPath(
				`/contest/${contest.data.ref}/collection/${contestCollection.ref}/import/impressions`,
				'POST'
			);

			// Only the contest owner has the authority to import contest impressions. Testing for [participant]
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if contest [leader] tries to import the contest impressions', async () => {
			// Login the leader to test his authority
			await login(leader.email, leader.rawPass);

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

			options.uri = signPath(
				`/contest/${contest.data.ref}/collection/${contestCollection.ref}/import/impressions`,
				'POST'
			);

			// Only the contest owner has the authority to import contest impressions. Testing for [leader]
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if contest [guide] tries to import the contest impressions', async () => {
			// Login the guide to test his authority
			await login(guide.email, guide.rawPass);

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

			options.uri = signPath(
				`/contest/${contest.data.ref}/collection/${contestCollection.ref}/import/impressions`,
				'POST'
			);

			// Only the contest owner has the authority to import contest impressions. Testing for [guide]
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if contest [member] tries to import the contest impressions', async () => {
			// Login the member to test his authority
			await login(member.email, member.rawPass);

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

			options.uri = signPath(
				`/contest/${contest.data.ref}/collection/${contestCollection.ref}/import/impressions`,
				'POST'
			);

			// Only the contest owner has the authority to import contest impressions. Testing for [member]
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
