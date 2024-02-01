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
	createDivisionMemberWithRole,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	checkContestTeamData,
	getContest,
	createContest,
	createContestDivision,
	createContestParticipant,
	createTraditionalTeam,
} = require('../common.js');

describe('Contest', () => {
	let options,
		contestAdmin,
		contestAdminData,
		anotherContestAdmin,
		anotherContestAdminData,
		unrelatedUser,
		userData,
		participant,
		admin,
		divisionMember,
		divisionLeader,
		anotherDivisionLeader,
		anotherDivisionMember,
		anotherContestDivisionLeader,
		anotherContestDivisionMember,
		contestTeam,
		division,
		anotherDivision,
		anotherContestTeam,
		anotherContestDivision,
		traditionalTeam;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		contestAdmin = generateUserData();
		contestAdminData = await createItem(createUserPath, contestAdmin);

		anotherContestAdmin = generateUserData();
		anotherContestAdminData = await createItem(createUserPath, anotherContestAdmin);

		unrelatedUser = generateUserData();
		await createItem(createUserPath, unrelatedUser);

		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Contest Team
		contestTeam = await createContest();

		// Create Division
		division = await createContestDivision(contestTeam.data.ref);

		// Create Another Division
		anotherDivision = await createContestDivision(contestTeam.data.ref);

		// Create an Admin without a Division and Role
		admin = await createContestParticipant(contestAdmin, contestTeam.data.ref, 'admin');

		// Create a Participant without a Division and Role
		participant = await createContestParticipant(contestAdmin, contestTeam.data.ref, 'participant');

		// Create Participant and Assign Leader Role
		divisionLeader = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			division,
			'leader'
		);

		// Create Participant and Assign Member Role
		divisionMember = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			division,
			'member'
		);

		// Create Participant and Assign Member Role (Same Contest, Another Division)
		anotherDivisionLeader = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			anotherDivision,
			'leader'
		);

		// Create Participant and Assign Member Role (Same Contest, Another Division)
		anotherDivisionMember = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			anotherDivision,
			'member'
		);

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
		traditionalTeam = await createTraditionalTeam();
	});

	describe('Team Stats', () => {
		beforeEach(async () => {
			// Let contest admin be the default user
			await login(contestAdmin.email, contestAdmin.rawPass);

			options.transform = null;
			options.method = 'POST';
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);

			options.body = {
				metadata: JSON.stringify({field: 'test sample'}),
			};
		});

		/* Positive tests */
		it('should be successful and return proper data when adding metadata for contest[admin]', async () => {
			// Add metadata for a contest admin
			options.uri = signPath(`/contest/${contestTeam.data.ref}/user/${admin.ref}/metadata`, 'POST');
			let contest = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			checkContestTeamData(updatedContest.data, 'admin');
		});

		it('should be successful and return proper data when adding metadata for contest[participant]', async () => {
			// Add metadata for a contest participant
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);
			let contest = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			checkContestTeamData(updatedContest.data, 'admin');
		});

		it('should be successful and return proper data when adding metadata[object]', async () => {
			options.body = {
				metadata: {medal: 'gold'},
			};

			// Add metadata for a contest participant
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);
			let contest = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			checkContestTeamData(updatedContest.data, 'admin');
		});

		/* Negative tests */

		it('should not be accessible using a [traditional team]', async () => {
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using an [invalid contest ref]', async () => {
			let invalidRef = makeUniqueString();
			options.uri = signPath(`/contest/${invalidRef}/user/${participant.ref}/metadata`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using an [invalid user ref]', async () => {
			let invalidRef = makeUniqueString();
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${invalidRef}/metadata`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add metadata if current user is a [non participant]', async () => {
			await login(unrelatedUser.email, unrelatedUser.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add metadata if current user is a [non assigned participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add metadata if current user is a [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add metadata if current user is a [contest admin] from another contest', async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add metadata if current user is a [division leader] from another contest', async () => {
			await login(anotherContestDivisionLeader.email, anotherContestDivisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add metadata if current user is a [division member] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/user/${participant.ref}/metadata`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if metadata is not a valid stringified json object [string]', async () => {
			options.body.metadata = makeUniqueString();
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if metadata is not a valid stringified json object [int]', async () => {
			options.body.metadata = 1234;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if metadata is not a valid stringified json object [float]', async () => {
			options.body.metadata = 1.5;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if metadata exceeds the max char limit[4000]', async () => {
			let fieldValue = makeUniqueString(4001);
			options.body.metadata = JSON.stringify({field: fieldValue});
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
