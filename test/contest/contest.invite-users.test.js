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
	createTraditionalTeam,
	createContest,
	createContestDivision,
	createDivisionMemberWithRole,
} = require('../common.js');

describe('Team', () => {
	let options,
		teamData,
		createUserPath,
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
		teamResponse,
		contestAdmin,
		contestAdminData,
		mainContest,
		anotherContestAdmin,
		anotherContestAdminData,
		traditionalTeam,
		targetRole,
		division,
		divisionLeader,
		divisionGuide,
		divisionMember;

	before(async () => {
		createUserPath = baseUrl + '/user';

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
	});

	describe('Invite Users', () => {
		beforeEach(async () => {
			options = {...basePostOptions};

			contestAdmin = generateUserData();
			contestAdminData = await createItem(createUserPath, contestAdmin);

			anotherContestAdmin = generateUserData();
			anotherContestAdminData = await createItem(createUserPath, anotherContestAdmin);

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

			await login(contestAdmin.email, contestAdmin.rawPass);

			// Create Traditional Team
			traditionalTeam = await createTraditionalTeam();

			mainContest = await createContest();

			// Create Division
			division = await createContestDivision(mainContest.data.ref);

			// Create Participant and Assign Leader Role
			divisionLeader = await createDivisionMemberWithRole(
				contestAdmin,
				mainContest,
				division,
				'leader'
			);

			// Create Participant and Assign Guide Role
			divisionGuide = await createDivisionMemberWithRole(
				contestAdmin,
				mainContest,
				division,
				'guide'
			);

			// Create Participant and Assign Member Role
			divisionMember = await createDivisionMemberWithRole(
				contestAdmin,
				mainContest,
				division,
				'member'
			);

			targetRole = 'participant';
			options.transform = null;
			options.method = 'POST';
			baseInvitePath = `/contest/${mainContest.data.ref}/invite/role`;
			baseDeleteInvitePath = `/raw/team/${mainContest.data.ref}/invite/remove`;

			options.uri = signPath(`${baseInvitePath}/${targetRole}`, 'POST');

			//invite user2 as default
			options.body = {
				invitees: [user2.ref],
			};

			let addRelationPath = `/team/${mainContest.data.ref}/user`;

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

		afterEach(async () => {
			//delete user invites after each test to reset the data
			options.body = {
				invitees: [user2.ref, user3.ref, user4.ref],
			};
			options.uri = signPath(baseDeleteInvitePath, 'POST');
			await request(options);
		});

		/* Positive tests */
		it('should return correct success status code when inviting with [participant] role', async () => {
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return correct success status code when inviting with [admin] role', async () => {
			options.uri = signPath(`${baseInvitePath}/admin`, 'POST');
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

		it('should be successful when inviting through a team [owner]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass); // by default the creator is also the owner
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful when inviting through a team [admin]', async () => {
			await login(admin.email, admin.rawPass);
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 200);
		});

		/*
        |--------------------------------------------------------------------------
        | Negative Tests
        |--------------------------------------------------------------------------
        */

		it('should fail if the the team ref provided is invalid', async () => {
			let invalidTeamRef = makeUniqueString();
			let path = `/contest/${invalidTeamRef}/invite/role/participant`;
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
				invitees: ['#$@#!#', `@${user3.handle}`, user4.email],
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
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be fail when inviting through a team [liker]', async () => {
			await login(liker.email, liker.rawPass);
			await likeOrFollowTeam('like', mainContest.data.ref);
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be fail when inviting through a team [follower]', async () => {
			await login(follower.email, follower.rawPass);
			await likeOrFollowTeam('follow', mainContest.data.ref);
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be successful when inviting through a team [editor]', async () => {
			await login(editor.email, editor.rawPass);
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be fail when inviting through a user that is not related to the team [notRelatedUser]', async () => {
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it("should be successful when inviting through another contest's [admin]", async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it("should be successful when inviting through another contest's [admin]", async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it("should be successful when inviting through another contest's [admin]", async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it("should be successful when inviting through another contest's [admin]", async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`${baseInvitePath}/participant`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it("should return an error if the user's role to copy is invalid (random input)", async () => {
			options.uri = signPath(`${baseInvitePath}/${makeUniqueString()}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it("should return an error if the user's role to copy is invalid (known excluded team roles)", async () => {
			let targetRoles = [
				'creator',
				'owner',
				'leader',
				'guide',
				'member',
				'editor',
				'follow',
				'like',
			];
			for (let i = 0; i < targetRoles.length; i++) {
				let role = targetRoles[i];
				options.uri = signPath(`${baseInvitePath}/${role}`, 'POST');
				await checkStatusCodeByOptions(options, 400);
			}
		});
	});
});
