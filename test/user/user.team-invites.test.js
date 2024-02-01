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
		teamOwnerDData;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

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

		userB = generateUserData();
		userBData = await createItem(createUserPath, userB);

		teamOwnerA = generateUserData();
		teamOwnerAData = await createItem(createUserPath, teamOwnerA);

		teamOwnerB = generateUserData();
		teamOwnerBData = await createItem(createUserPath, teamOwnerB);

		teamOwnerC = generateUserData();
		teamOwnerCData = await createItem(createUserPath, teamOwnerC);

		teamOwnerD = generateUserData();
		teamOwnerDData = await createItem(createUserPath, teamOwnerD);

		teamOwners.push(teamOwnerA, teamOwnerB, teamOwnerC, teamOwnerD);

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
		teamB = teams[1];
		teamC = teams[2];
		teamD = teams[3];
		teamsWhoInvited.push(teamA, teamB, teamC);

		// Invite the user with teamA
		await inviteUserToTeam(teamA, teamOwnerA, userData.data);

		// Invite the user with teamB
		await inviteUserToTeam(teamB, teamOwnerB, userData.data);

		// Invite the user with teamC
		await inviteUserToTeam(teamC, teamOwnerC, userData.data);
	});

	describe('Join Request List', () => {
		beforeEach(async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath('/user/team/invites', 'GET');
			options.transform = null;
			options.method = 'GET';
		});

		/* Positive tests */
		it('should be successful', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data', async () => {
			let userTeamInvites = await request(options);
			expect(userTeamInvites).to.be.an('array');
			expect(userTeamInvites.length).to.equal(teamsWhoInvited.length);
			let teamsWhoInvitedRefs = _pluck(teamsWhoInvited, 'ref');

			for (let ctr = 0; ctr <= userTeamInvites.length - 1; ctr++) {
				let invite = userTeamInvites[ctr];

				// Make sure that the invited user is correct for all the invites
				expect(invite.user_ref).to.equal(userData.data.ref);

				// Make sure that teamsWhoInvited are correct and included in the results.
				expect(teamsWhoInvitedRefs.includes(invite.team_ref)).to.equal(true);

				// Make sure the rest of the properties are correct.
				expect(invite.status).to.equal('pending');
				expect(invite.role).to.equal('member');
			}
		});

		/* Negative tests */
		it("should not have access to other user's list", async () => {
			await login(userB.email, userB.rawPass);
			options.uri = signPath('/user/team/invites', 'GET');
			let userTeamInvites = await request(options);

			// userB should not have access to user's invites, and since no team has really invited userB, the response data should be an empty array.
			expect(userTeamInvites.length).to.equal(0);
		});
	});
});
