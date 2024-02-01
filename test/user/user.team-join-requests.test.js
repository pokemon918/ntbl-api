const expect = require('chai').expect;
const request = require('request-promise');

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
		otherUser,
		otherUserData,
		owner,
		ownerData;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		teamsJoined = [];
		teamsNotJoined = [];
		otherTeamsJoined = [];
		joinRequests = [];
		otherJoinRequests = [];

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		otherUser = generateUserData();
		otherUserData = await createItem(createUserPath, otherUser);

		owner = generateUserData();
		ownerData = await createItem(createUserPath, owner);

		await login(owner.email, owner.rawPass);

		// Teams user intends to join
		for (let ctr = 0; ctr <= 2; ctr++) {
			let teamData = {
				name: makeUniqueString(),
				handle: makeUniqueString(),
				description: makeUniqueString(),
				visibility: 'private',
			};

			options.uri = signPath('/team', 'POST');
			let teamResponse = await createItem(options.uri, teamData);
			teamsJoined.push(teamResponse.data.ref);
		}

		// Teams user doesn't intend to join
		for (let ctr = 0; ctr <= 2; ctr++) {
			let teamData = {
				name: makeUniqueString(),
				handle: makeUniqueString(),
				description: makeUniqueString(),
				visibility: 'private',
			};

			options.uri = signPath('/team', 'POST');
			let teamResponse = await createItem(options.uri, teamData);
			teamsNotJoined.push(teamResponse.data.ref);
		}

		// Teams for other user
		for (let ctr = 0; ctr <= 1; ctr++) {
			let teamData = {
				name: makeUniqueString(),
				handle: makeUniqueString(),
				description: makeUniqueString(),
				visibility: 'private',
			};

			options.uri = signPath('/team', 'POST');
			let teamResponse = await createItem(options.uri, teamData);
			otherTeamsJoined.push(teamResponse.data.ref);
		}

		// Join the intended teams
		await login(user.email, user.rawPass);
		for (let ctr = 0; ctr <= teamsJoined.length - 1; ctr++) {
			options.uri = signPath('/team/' + teamsJoined[ctr] + '/join', 'POST');
			let joinRequest = await request(options);
			joinRequests.push(joinRequest.data);
		}

		// Join the other user's teams
		await login(otherUser.email, otherUser.rawPass);
		for (let ctr = 0; ctr <= otherTeamsJoined.length - 1; ctr++) {
			options.uri = signPath('/team/' + otherTeamsJoined[ctr] + '/join', 'POST');
			let joinRequest = await request(options);
			otherJoinRequests.push(joinRequest.data);
		}
	});

	describe('Join Request List', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
		});

		/* Positive tests */
		it('should be successful', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath('/user/team/join-requests', 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath('/user/team/join-requests', 'GET');
			let userJoinRequests = await request(options);
			expect(userJoinRequests).to.be.an('array');
			expect(userJoinRequests.length).to.equal(teamsJoined.length);

			for (let ctr = 0; ctr <= userJoinRequests.length - 1; ctr++) {
				let joinedTeamRef = userJoinRequests[ctr].team_ref;
				expect(teamsJoined.includes(joinedTeamRef)).to.equal(true);
				expect(teamsNotJoined.includes(joinedTeamRef)).to.equal(false);
			}
		});

		/* Negative tests */
		it("should not have access to other user's list", async () => {
			await login(otherUser.email, otherUser.rawPass);
			options.uri = signPath('/user/team/join-requests', 'GET');

			let otherUserJoinRequests = await request(options);
			expect(otherUserJoinRequests).to.be.an('array');
			expect(otherUserJoinRequests.length).to.not.equal(teamsJoined.length);

			for (let ctr = 0; ctr <= otherUserJoinRequests.length - 1; ctr++) {
				let joinedTeamRef = otherUserJoinRequests[ctr].team_ref;
				expect(teamsJoined.includes(joinedTeamRef)).to.equal(false);
				expect(teamsNotJoined.includes(joinedTeamRef)).to.equal(false);
			}
		});
	});
});
