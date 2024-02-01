const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const expect = require('chai').expect;
const request = require('request-promise');

const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	generateJoinContestRequest,
	approveJoinRequest,
	createDivisionMemberWithRole,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	getContest,
	createContest,
	createContestDivision,
	createContestCollection,
	createContestParticipant,
	createTraditionalTeam,
	createTraditionalCollection,
} = require('../common.js');

describe('Contest', () => {
	let options,
		contestAdmin,
		contestAdminData,
		anotherContestAdmin,
		anotherContestAdminData,
		user,
		userData,
		participant,
		divisionMember,
		divisionGuide,
		divisionLeader,
		anotherDivisionLeader,
		anotherDivisionMember,
		anotherContestDivisionLeader,
		anotherContestDivisionMember,
		contestTeam,
		division,
		anotherDivision,
		contestCollection,
		contestImpressions,
		contestImpression,
		anotherContestTeam,
		anotherContestDivision,
		anotherContestCollection,
		anotherContestImpressions,
		anotherContestImpression,
		traditionalTeam,
		traditionalCollection,
		traditionalImpression,
		usedJoinedRequest;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		contestAdmin = generateUserData();
		contestAdminData = await createItem(createUserPath, contestAdmin);

		anotherContestAdmin = generateUserData();
		anotherContestAdminData = await createItem(createUserPath, anotherContestAdmin);

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		// Simulate Login
		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Contest Team
		contestTeam = await createContest();

		// Create Division
		division = await createContestDivision(contestTeam.data.ref);

		// Create Participant and Assign Leader Role
		divisionLeader = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			division,
			'leader'
		);

		// Create Participant and Assign Guide Role
		divisionGuide = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			division,
			'guide'
		);

		// Create Participant and Assign Member Role
		divisionMember = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			division,
			'member'
		);

		// Create Participant without a Division and Role
		participant = await createContestParticipant(contestAdmin, contestTeam.data.ref, 'participant');

		// Create Another Contest Team
		await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
		anotherContestTeam = await createContest();

		// Create a Division that belongs to another Contest
		anotherContestDivision = await createContestDivision(anotherContestTeam.data.ref);

		// Create Participant and Assign Leader Role
		anotherContestDivisionLeader = await createDivisionMemberWithRole(
			anotherContestAdmin,
			anotherContestTeam,
			anotherContestDivision,
			'leader'
		);

		// Create Participant and Assign Member Role
		anotherContestDivisionMember = await createDivisionMemberWithRole(
			anotherContestAdmin,
			anotherContestTeam,
			anotherContestDivision,
			'member'
		);

		// Create Traditional Team
		await login(contestAdmin.email, contestAdmin.rawPass);
		traditionalTeam = await createTraditionalTeam();
	});

	const checkDeclinedData = (declineJoinRequestResponse, joinRequest) => {
		expect(declineJoinRequestResponse.statusCode).to.equal(200);
		expect(declineJoinRequestResponse.body.data.status).to.equal('declined');
		expect(declineJoinRequestResponse.body.data.user_ref).to.equal(joinRequest.user.ref);
		expect(declineJoinRequestResponse.body.data.team_ref).to.equal(joinRequest.request.team_ref);
	};

	describe("Decline User's Join Requests", () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
		});

		/* Positive tests */
		it('should be successful and return proper data', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				'/team/' + contestTeam.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let declineJoinRequestResponse = await request(options);
			checkDeclinedData(declineJoinRequestResponse, joinRequest);
			usedJoinedRequest = joinRequest;

			// Check that the user relation is not created
			await login(joinRequest.user.email, joinRequest.user.rawPass);
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let contestResponse = await request(options);
			let userRelations = contestResponse.data.user_relations;
			expect(userRelations.length).to.equal(1);
			expect(userRelations[0]).to.equal('unrelated');
		});

		/* Negative tests */
		it('should not be able to decline join request with [division leader]', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(user.email, user.rawPass);
			options.uri = signPath(
				'/team/' + contestTeam.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline join request with [division leader]', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				'/team/' + contestTeam.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline join request with [division guide]', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(
				'/team/' + contestTeam.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline join request with [division member]', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(
				'/team/' + contestTeam.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline join request that was already declined', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				'/team/' + contestTeam.data.ref + '/decline/' + usedJoinedRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline invalid join request with invalid action ref', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				'/team/' + contestTeam.data.ref + '/decline/' + makeUniqueString(),
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline invalid join request with invalid team', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				'/team/' + makeUniqueString() + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline valid join request that has wrong team', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				'/team/' + traditionalTeam.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
