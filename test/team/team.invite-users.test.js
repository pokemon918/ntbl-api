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
	likeOrFollowTeam,
} = require('../common.js');

describe('Team', () => {
	let options,
		teamData,
		baseInvitePath,
		baseDeleteInvitePath,
		checkProperData,
		user1,
		user2,
		user3,
		user4,
		creator,
		admin,
		editor,
		member,
		follower,
		liker,
		notRelatedUser,
		user1Data,
		user2Data,
		user3Data,
		user4Data,
		creatorData,
		adminData,
		editorData,
		memberData,
		followerData,
		likerData,
		notRelatedUserData,
		teamResponse;

	before(async () => {
		options = {...basePostOptions};
		/*
			Synopsis:
			- Create 4 users.
			- User1 will create a team for testing
			- 3 Additiona users will be used for testing the invites
		*/

		let createUserPath = baseUrl + '/user';

		// Create user1
		user1 = generateUserData();
		user1.handle = 'u1' + makeUniqueString();
		user1Data = await createItem(createUserPath, user1);
		user1.ref = user1Data.data.ref;

		// Create user2
		user2 = generateUserData();
		user2.handle = 'u2' + makeUniqueString();
		user2Data = await createItem(createUserPath, user2);
		user2.ref = user2Data.data.ref;

		// Create user3
		user3 = generateUserData();
		user3.handle = 'u3' + makeUniqueString();
		user3Data = await createItem(createUserPath, user3);
		user3.ref = user3Data.data.ref;

		// Create user3
		user4 = generateUserData();
		user4.handle = 'u4' + makeUniqueString();
		user4Data = await createItem(createUserPath, user4);
		user4.ref = user4Data.data.ref;

		// Create team creator
		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		// Create team admin
		admin = generateUserData();
		adminData = await createItem(createUserPath, admin);

		// Create team editor
		editor = generateUserData();
		editorData = await createItem(createUserPath, editor);

		// Create team member
		member = generateUserData();
		memberData = await createItem(createUserPath, member);

		// Create team follower
		follower = generateUserData();
		followerData = await createItem(createUserPath, follower);

		// Create team like
		liker = generateUserData();
		likerData = await createItem(createUserPath, liker);

		// Create a user that is not related to the team in any way
		notRelatedUser = generateUserData();
		notRelatedUserData = await createItem(createUserPath, notRelatedUser);

		// Relinquish ownership and pass it to admin
		await login(creator.email, creator.rawPass);

		// Create a team. Initially owned by user1
		teamData = {
			name: makeUniqueString(),
			handle: makeUniqueString(),
			description: 'team description',
			visibility: 'public',
		};

		let createTeamPath = signPath('/team', 'POST');
		teamResponse = await createItem(createTeamPath, teamData);
		baseInvitePath = `/team/${teamResponse.data.ref}/invite/role`;
		baseDeleteInvitePath = `/raw/team/${teamResponse.data.ref}/invite/remove`;

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
	});

	describe('Invite Users', () => {
		beforeEach(async () => {
			options.uri = signPath(`${baseInvitePath}/member`, 'POST');
			//invite user2 as default
			options.body = {
				invitees: [user2.ref],
			};
			await login(creator.email, creator.rawPass);
		});

		afterEach(async () => {
			//delete user invites after each test to reset the data
			options.body = {
				invitees: [user2.ref, user3.ref, user4.ref],
			};
			options.uri = signPath(baseDeleteInvitePath, 'POST');
			await request(options);
		});

		/* Positive tests */
		it('should return correct success status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting a user by its ref', async () => {
			options.body = {
				invitees: [user2.ref],
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting a user by its handle', async () => {
			options.body = {
				invitees: [`@${user2.handle}`],
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting an existing user by its email', async () => {
			options.body = {
				invitees: [user2.email],
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting a non-existing user by its email', async () => {
			options.body = {
				invitees: [makeUniqueString() + '@ntbl-api.com'],
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting multiple users by their refs', async () => {
			options.body = {
				invitees: [user2.ref, user3.ref, user4.ref],
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting multiple users by their handles', async () => {
			options.body = {
				invitees: [`@${user2.handle}`, `@${user3.handle}`, `@${user4.handle}`],
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting multiple users by their emails', async () => {
			options.body = {
				invitees: [user2.email, user3.email, user4.email],
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting multiple users by a mix of ref, handle and email', async () => {
			options.body = {
				invitees: [user2.ref, `@${user3.handle}`, user4.email],
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting a [member]', async () => {
			await login(editor.email, editor.rawPass);
			options.uri = signPath(`${baseInvitePath}/member`, 'POST');
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting an [editor]', async () => {
			await login(editor.email, editor.rawPass);
			options.uri = signPath(`${baseInvitePath}/editor`, 'POST');
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting an [admin]', async () => {
			await login(editor.email, editor.rawPass);
			options.uri = signPath(`${baseInvitePath}/admin`, 'POST');
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting through a team [owner]', async () => {
			await login(creator.email, creator.rawPass); // by default the creator is also the owner
			options.uri = signPath(`${baseInvitePath}/member`, 'POST');
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting through a team [admin]', async () => {
			await login(admin.email, admin.rawPass);
			options.uri = signPath(`${baseInvitePath}/member`, 'POST');
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting through a team [editor]', async () => {
			await login(editor.email, editor.rawPass);
			options.uri = signPath(`${baseInvitePath}/member`, 'POST');
			await checkStatusCodeByOptions(options, 200);
		});

		/*
    |--------------------------------------------------------------------------
    | Negative Tests
    |--------------------------------------------------------------------------
    */

		it('should fail if the the team ref provided is invalid', async () => {
			let invalidTeamRef = makeUniqueString();
			let path = `/team/${invalidTeamRef}/invite`;
			options.uri = signPath(path, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if the invitees is null or empty', async () => {
			options.body = {
				invitees: null,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if the invitees is numeric', async () => {
			options.body = {
				invitees: 1234,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if the invitees is a string', async () => {
			options.body = {
				invitees: 'string',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if the invitees has one invalid ref', async () => {
			options.body = {
				invitees: ['@#$@#!#', `@${user3.handle}`, user4.email],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if the invitees has one invalid handle', async () => {
			options.body = {
				invitees: [user3.ref, `@${user3.handle}!@##@%`, user4.email],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if the invitees has one invalid email', async () => {
			options.body = {
				invitees: [user3.ref, `@${user3.handle}`, `${user4.email}!@##@%`],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if the invitees has one non-existing or invalid user', async () => {
			options.body = {
				invitees: [user3.ref, `@${user3.handle}`, `${user4.email}`, 'non-existing'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be fail when inviting through a team [member]', async () => {
			await login(member.email, member.rawPass);
			options.uri = signPath(baseInvitePath, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be fail when inviting through a team [liker]', async () => {
			await login(liker.email, liker.rawPass);
			await likeOrFollowTeam('like', teamResponse.data.ref);
			options.uri = signPath(baseInvitePath, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be fail when inviting through a team [follower]', async () => {
			await login(follower.email, follower.rawPass);
			await likeOrFollowTeam('follow', teamResponse.data.ref);
			options.uri = signPath(baseInvitePath, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be fail when inviting through a user that is not related to the team [notRelatedUser]', async () => {
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			options.uri = signPath(baseInvitePath, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail when inviting an invalid role', async () => {
			await login(editor.email, editor.rawPass);
			const role = makeUniqueString();
			options.uri = signPath(`${baseInvitePath}/${role}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
