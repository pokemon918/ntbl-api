const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	getItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	makeRandomInt,
	login,
	signPath,
} = require('../common.js');

describe('Team', () => {
	let options,
		teamData,
		basePath,
		checkProperData,
		user1,
		user2,
		user3,
		user1Data,
		user2Data,
		user3Data,
		teamResponse;

	before(async () => {
		options = {...basePostOptions};
		/*
			Synopsis:
			- Create 3 users.
			- User1 will create a team
			- User2 will be "added" to the team by User1
			- User1 will pass ownership to User2
			- User3 can be "added" to the team by User1 or User2
		*/

		let createUserPath = baseUrl + '/user';

		// Create user1
		user1 = generateUserData();
		user1.handle = 'u1' + makeUniqueString();
		user1Data = await createItem(createUserPath, user1);

		// Create user2
		user2 = generateUserData();
		user2.handle = 'u2' + makeUniqueString();
		user2Data = await createItem(createUserPath, user2);

		// Create user3
		user3 = generateUserData();
		user3Data = await createItem(createUserPath, user3);

		// Simulate login for user 1, as he will be the initial owner of the team
		await login(user1.email, user1.rawPass);

		// Create a team. Initially owned by user1
		teamData = {
			name: makeUniqueString(),
			handle: makeUniqueString(),
			description: 'team description',
			visibility: 'public',
		};

		let createTeamPath = signPath('/team', 'POST');
		teamResponse = await createItem(createTeamPath, teamData);
		basePath = `/team/${teamResponse.data.ref}/user`;
	});

	describe('Add team relations', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = null;
		});

		/* Positive tests */
		it('should return correct success status code', async () => {
			// Add user2 to be a member of the team
			options.uri = signPath(basePath + '/' + user2Data.data.ref, 'POST');

			options.body = {
				relation: ['member'],
			};

			await checkStatusCodeByOptions(options, 201);
		});

		it('should be successful when using @teamHandle instead of teamRef', async () => {
			options.uri = signPath(
				`/team/@${teamData.handle.toLowerCase()}/user/${user2Data.data.ref}`,
				'POST'
			);
			options.body = {
				relation: ['member'],
			};

			await checkStatusCodeByOptions(options, 201);
		});

		it('should be successful when using @userHandle instead of userRef', async () => {
			options.uri = signPath(basePath + '/@' + user2.handle, 'POST');
			options.body = {
				relation: ['member'],
			};

			await checkStatusCodeByOptions(options, 201);
		});

		it('should be successful when using both @teamHandle and @userHandle instead of teamRef and userRef', async () => {
			options.uri = signPath(
				`/team/@${teamData.handle.toLowerCase()}/user/@${user2.handle}`,
				'POST'
			);
			options.body = {
				relation: ['member'],
			};

			await checkStatusCodeByOptions(options, 201);
		});

		it('should be successful when adding a user as admin', async () => {
			let path = signPath(basePath + '/' + user2Data.data.ref, 'POST');
			let relationData = (options.body = {
				relation: ['admin'],
			});
			let response = await createItem(path, relationData);
			checkForSuccess(response);
		});

		it('should be successful when adding a user as editor', async () => {
			let path = signPath(basePath + '/' + user2Data.data.ref, 'POST');
			let relationData = (options.body = {
				relation: ['editor'],
			});
			let response = await createItem(path, relationData);
			checkForSuccess(response);
		});

		it('should be successful when adding a user as member', async () => {
			let path = signPath(basePath + '/' + user2Data.data.ref, 'POST');
			let relationData = (options.body = {
				relation: ['member'],
			});
			let response = await createItem(path, relationData);
			checkForSuccess(response);
		});

		it('should be successful when adding a user to a team with multiple valid roles', async () => {
			let path = signPath(basePath + '/' + user2Data.data.ref, 'POST');
			let relationData = (options.body = {
				relation: ['admin', 'editor', 'member'],
			});
			let response = await createItem(path, relationData);
			checkForSuccess(response);
		});

		it('should not lose ownership when assigning it to self', async () => {
			let path = signPath(basePath + '/' + user1Data.data.ref, 'POST');
			let relationData = (options.body = {
				relation: ['owner'],
			});
			let team = await createItem(path, relationData);
			let isOwner = team.data.userRelations.includes('owner');
			expect(isOwner).to.equal(true);
		});

		it('should be successful when passing ownership to another user', async () => {
			// Pass ownership by including a payload of "owner" to the relations array
			let path = signPath(basePath + '/' + user2Data.data.ref, 'POST');
			let relationData = (options.body = {
				relation: ['owner'],
			});
			let team = await createItem(path, relationData);
			let isOwner = team.data.userRelations.includes('owner');
			expect(isOwner).to.equal(true);
		});

		/* Negative tests */

		it('should return an error if the user is not an admin or owner of the team', async () => {
			/*
				At this point, the user1 is no longer the owner of the team (due to the previous test)
				Therefore, he can no longer add members to the team that he doesn't own or not an admin to
			*/

			// Add user3 to be a member of the team
			options.uri = signPath(basePath + '/' + user3Data.data.ref, 'POST');

			options.body = {
				relation: ['member'],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload is empty', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath(basePath + '/' + user3Data.data.ref, 'POST');

			options.body = null;

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if relation in not in the payload is empty', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath(basePath + '/' + user3Data.data.ref, 'POST');

			options.body = {};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if relation is null', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath(basePath + '/' + user3Data.data.ref, 'POST');

			options.body = {
				relation: null,
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if relation is empty', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath(basePath + '/' + user3Data.data.ref, 'POST');

			options.body = {
				relation: [],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if team ref is invalid', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath('/team/invalidteamref/user/' + user3Data.data.ref, 'POST');

			options.body = {
				relation: [],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if @teamhandle is invalid', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath('/team/@invalidteamhandle/user/' + user3Data.data.ref, 'POST');

			options.body = {
				relation: [],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if user ref is invalid', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath(basePath + '/invalidUserRef', 'POST');

			options.body = {
				relation: [],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if @userHandle is invalid', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath(basePath + '/@invalidUserHandle', 'POST');

			options.body = {
				relation: [],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if user tries to post follow relation', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath(basePath + '/' + user3Data.data.ref, 'POST');

			options.body = {
				relation: ['follow'],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if user tries to post like relation', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath(basePath + '/' + user3Data.data.ref, 'POST');

			options.body = {
				relation: ['like'],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if user tries to post an invalid or random string', async () => {
			// Login use2, to take over and proceed with other tests
			await login(user2.email, user2.rawPass);

			options.uri = signPath(basePath + '/' + user3Data.data.ref, 'POST');

			options.body = {
				relation: ['thisissorandom', '310uafsdl!#$#'],
			};

			await checkStatusCodeByOptions(options, 400);
		});
	});
});
