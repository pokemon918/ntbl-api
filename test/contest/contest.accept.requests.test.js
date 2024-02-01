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
	createTraditionalTeam,
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
		traditionalImpression;

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
		let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
		let approveRequest = await approveJoinRequest(
			contestAdmin,
			contestTeam.data.ref,
			joinRequest.request.ref
		);
		participant = joinRequest.user;

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

	describe("Accept User's Join Requests", () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
		});

		/* Positive tests */

		it('should be successful and return proper data (admin)', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'admin');
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/accept/user/${joinRequest.user.ref}`,
				'POST'
			);
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);

			let responseUser = updatedContest.data.admins.find((user) => {
				return user.ref === joinRequest.user.ref;
			});

			expect(responseUser.ref).to.equal(joinRequest.user.ref);
		});

		it('should be successful and return proper data (participant)', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/accept/user/${joinRequest.user.ref}`,
				'POST'
			);
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);

			let responseUser = updatedContest.data.participants.find((user) => {
				return user.ref === joinRequest.user.ref;
			});

			expect(responseUser.ref).to.equal(joinRequest.user.ref);
		});

		it('should be successful and return proper data with a user that has made multiple requests', async () => {
			let latestRoleRequest = 'admin';
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'admin');

			latestRoleRequest = 'participant';
			joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');

			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/accept/user/${joinRequest.user.ref}`,
				'POST'
			);

			// Transform to plural
			latestRoleRequest = latestRoleRequest + 's';

			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);

			let responseUser = updatedContest.data[latestRoleRequest].find((user) => {
				return user.ref === joinRequest.user.ref;
			});

			expect(responseUser.ref).to.equal(joinRequest.user.ref);
		});

		/* Negative tests */

		it('should not be able to approve requests using a traditional team (as contest)', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/accept/user/${joinRequest.user.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to approve requests using a traditional team (as division)', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/accept/user/${joinRequest.user.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to approve requests using an invalid contest ref', async () => {
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${makeUniqueString()}/accept/user/${joinRequest.user.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to approve a user with no request', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(`/contest/${makeUniqueString()}/accept/user/${user.ref}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to approve requests if already a member (admin)', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/accept/user/${contestAdminData.data.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to approve requests if already a member (participant)', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/accept/user/${participant.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to approve requests if already a member (division leader)', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/accept/user/${divisionLeader.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to approve requests if already a member (division guide)', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/accept/user/${divisionGuide.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to approve requests if already a member (division member)', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/accept/user/${divisionMember.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to approve requests on other contests', async () => {
			let joinRequest = await generateJoinContestRequest(
				anotherContestTeam.data.ref,
				'participant'
			);
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/accept/user/${joinRequest.user.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
