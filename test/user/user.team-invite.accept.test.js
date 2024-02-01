const expect = require('chai').expect;
const request = require('request-promise');
const _pluck = require('lodash').map;

const {
	baseUrl,
	basePostOptions,
	createItem,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	checkCreateStatusCode,
	checkStatusCodeByOptions,
	login,
	signPath,
	inviteUserToTeam,
} = require('../common.js');

describe('User', () => {
	let options,
		teamsJoined,
		otherTeamsJoined,
		teamsNotJoined,
		joinRequests,
		otherJoinRequests,
		createUserPath,
		user,
		userData,
		userB,
		userBData,
		teamA,
		teamB,
		teamC,
		teamD,
		teamsWhoInvited,
		teamOwnerA,
		teamOwnerAData,
		teamOwnerB,
		teamOwnerBData,
		teamOwnerC,
		teamOwnerCData,
		teamOwnerD,
		teamOwnerDData,
		inviteA;

	const checkProperData = (inviteResult) => {
		// Check for property existence
		expect(inviteResult).to.not.have.property('id');
		expect(inviteResult).to.have.property('ref');
		expect(inviteResult).to.have.property('status');
		expect(inviteResult).to.have.property('created_at');
		expect(inviteResult).to.have.property('updated_at');
		expect(inviteResult).to.have.property('user_ref');
		expect(inviteResult).to.have.property('team_ref');
		expect(inviteResult).to.have.property('role');

		// Check for correct data type
		expect(inviteResult.ref).to.be.a('string');
		expect(inviteResult.status).to.be.a('string');
		expect(inviteResult.created_at).to.be.a.dateString();
		expect(inviteResult.updated_at).to.be.a.dateString();
		expect(inviteResult.user_ref).to.be.a('string');
		expect(inviteResult.team_ref).to.be.a('string');
		expect(inviteResult.role).to.be.a('string');
	};

	before(async () => {
		options = {...basePostOptions};
	});

	describe('Join Request List', () => {
		beforeEach(async () => {
			/*
				NOTE: The setup is put under the beforeEach instead of before because a validation that the user is already a member of the team will be added later.			
			*/

			createUserPath = baseUrl + '/user';

			/*
				Summary:
				Create a user that will be invited.
				Create 4 other users that will be used to create teams. [teamOwnerA, teamOwnerB, teamOwnerC, teamOwnerD]
				Create 3 teams that will be used to invite a user. [teamA, teamB, teamC]
				Create 1 team that will NOT invite the user. [teamD]					
			*/
			let teamOwners = [];
			let teams = [];
			teamsWhoInvited = [];

			user = generateUserData();
			userData = await createItem(createUserPath, user);

			teamOwnerA = generateUserData();
			teamOwnerAData = await createItem(createUserPath, teamOwnerA);
			teamOwners.push(teamOwnerA);

			// Create teams for each team owner
			for (let owner of teamOwners) {
				await login(owner.email, owner.rawPass);
				const teamData = {
					handle: makeUniqueString(),
					name: makeUniqueString(),
					description: makeUniqueString(),
					city: makeUniqueString(),
					country: 'DK',
					visibility: 'public',
				};
				const path = signPath('/team', 'POST');
				const team = await createItem(path, teamData);
				teams.push(team.data);
			}

			// Init teams
			teamA = teams[0];
			teamsWhoInvited.push(teamA);

			// Invite the user with teamA
			await inviteUserToTeam(teamA, teamOwnerA, userData.data);

			// Setup the initial options
			await login(user.email, user.rawPass);
			options.uri = signPath('/user/team/invites', 'GET');
			options.transform = null;
			options.method = 'GET';
		});

		/* Positive tests */
		it('should be successful', async () => {
			// Get the user's invite list
			let teamInvites = await request(options);
			let inviteA = teamInvites[0];

			// Accept an invite from a team
			options.uri = signPath(`/user/team-invite/${inviteA.ref}/accept`, 'POST');
			options.method = 'POST';
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data', async () => {
			// Get the user's invite list
			let teamInvites = await request(options);
			let inviteA = teamInvites[0];

			// Accept an invite from a team
			options.uri = signPath(`/user/team-invite/${inviteA.ref}/accept`, 'POST');
			options.method = 'POST';
			let teamInviteResults = await request(options);
			checkProperData(teamInviteResults.data);
		});

		it('should have a response data that matches the team who invited and the user who accepted the invite', async () => {
			// Get the user's invite list
			let teamInvites = await request(options);
			let inviteA = teamInvites[0];

			// Accept an invite from a team
			options.uri = signPath(`/user/team-invite/${inviteA.ref}/accept`, 'POST');
			options.method = 'POST';
			let teamInviteResults = await request(options);
			let invite = teamInviteResults.data;

			expect(invite.user_ref).to.equal(userData.data.ref);
			expect(invite.team_ref).to.equal(teamA.ref);
			expect(invite.role).to.equal('member');
		});

		it('should be successful when accepting an admin role', async () => {
			let admin = generateUserData();
			let adminData = await createItem(createUserPath, admin);
			let inviteUserResult = await inviteUserToTeam(teamA, teamOwnerA, adminData.data, 'admin');

			await login(admin.email, admin.rawPass);
			options.uri = signPath('/user/team/invites', 'GET');
			let teamInvites = await request(options);
			let inviteA = teamInvites[0];

			// Accept an invite from a team
			options.uri = signPath(`/user/team-invite/${inviteA.ref}/accept`, 'POST');
			options.method = 'POST';
			let teamInviteResults = await request(options);
			let invite = teamInviteResults.data;
			expect(invite.user_ref).to.equal(adminData.data.ref);
			expect(invite.team_ref).to.equal(teamA.ref);
			expect(invite.role).to.equal('admin');
		});

		it('should be successful when accepting an editor role', async () => {
			let editor = generateUserData();
			let editorData = await createItem(createUserPath, editor);
			let inviteUserResult = await inviteUserToTeam(teamA, teamOwnerA, editorData.data, 'editor');

			await login(editor.email, editor.rawPass);
			options.uri = signPath('/user/team/invites', 'GET');
			let teamInvites = await request(options);
			let inviteA = teamInvites[0];

			// Accept an invite from a team
			options.uri = signPath(`/user/team-invite/${inviteA.ref}/accept`, 'POST');
			options.method = 'POST';
			let teamInviteResults = await request(options);
			let invite = teamInviteResults.data;
			expect(invite.user_ref).to.equal(editorData.data.ref);
			expect(invite.team_ref).to.equal(teamA.ref);
			expect(invite.role).to.equal('editor');
		});

		it.skip('should establish relationship between the team who invited and the user who have accepted the invitation', async () => {
			/*
				todo:later

				- This test should prove that the user who has been invited is now a member of the team after accepting the invite
				- This can be proven after the users/members are included in the get team by ref API (members are currently not included)
					Please see: https://trello.com/c/9aFxAuiS/1176-api-1176-teams-add-more-data-to-get-team-by-ref			
			*/
		});

		// Negative test
		it('should return an error for invalid action ref', async () => {
			// Get the user's invite list
			let invalidActionRef = makeUniqueString();

			// Accept an invite from a team
			options.uri = signPath(`/user/team-invite/${invalidActionRef}/accept`, 'POST');
			options.method = 'POST';
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is already a member', async () => {
			// Get the user's invite list
			let teamInvites = await request(options);
			let inviteA = teamInvites[0];

			// Accept an invite from a team
			options.uri = signPath(`/user/team-invite/${inviteA.ref}/accept`, 'POST');
			options.method = 'POST';
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			// The first attempt would be successful (200 status) and would establish the relationship between the team and the user.
			await checkStatusCodeByOptions(options, 200);

			// The second attemp should fail (400 status) because at this point, the user is already a member of the team.
			options.uri = signPath(`/user/team-invite/${inviteA.ref}/accept`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
