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
	createContestParticipant,
	createDivisionMemberWithRole,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	createContest,
	createContestDivision,
	createTraditionalTeam,
	addMetadataToContestUser,
	getContest,
	getContestUserMetadata,
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
		divisionLeader,
		anotherContestDivisionLeader,
		anotherContestDivisionMember,
		contestTeam,
		division,
		anotherDivision,
		anotherContestTeam,
		anotherContestDivision,
		traditionalTeam,
		contestRef,
		baseMetadata;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		contestAdmin = generateUserData();
		contestAdminData = await createItem(createUserPath, contestAdmin);

		anotherContestAdmin = generateUserData();
		anotherContestAdminData = await createItem(createUserPath, anotherContestAdmin);

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Contest Team
		contestTeam = await createContest();
		contestRef = contestTeam.data.ref;

		// Create Division
		division = await createContestDivision(contestRef);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();

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

		// Create Participant without a Division and Role
		participant = await createContestParticipant(contestAdmin, contestRef, 'participant');

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
	});

	describe('Team Stats', () => {
		beforeEach(async () => {
			// Let contest admin be the default user
			await login(contestAdmin.email, contestAdmin.rawPass);

			// Add metadata to participant
			baseMetadata = {
				metadata: JSON.stringify({confirmed_arrival: Date.now()}),
			};
			await addMetadataToContestUser(contestRef, participant.ref, baseMetadata);
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath(`/contest/${contestRef}/reset-members`, 'POST');
		});

		/* Positive tests */
		it('should be successful and remove all the division members of a contest', async () => {
			// Check the contest's data BEFORE executing the reset
			let contestData = await getContest(contestRef);
			let divisions = contestData.data.teams;

			// At this stage, the contest division members has not been reset so we expect each division to have members
			for (let i = 0; i < divisions.length; i++) {
				let membersCount = divisions[i].members;
				expect(membersCount).to.be.above(0);
			}

			//Execute the reset contest division members API
			await request(options);

			// Check the contest's data AFTER executing the reset
			contestData = await getContest(contestRef);
			divisions = contestData.data.teams;

			// Now all the members should be removed from all the contest's divisions
			for (let i = 0; i < divisions.length; i++) {
				let membersCount = divisions[i].members;
				expect(membersCount).to.equal(0);
			}
		});

		it("should be successful and set the confirmed_arrival to null in the contest's metadata", async () => {
			// Check the contest user's metadata.confirmed_arrival BEFORE the reset. It should be equal to the baseMetadata.confirmed_arrival.
			let contestData = await getContest(contestRef);
			let metadata = await getContestUserMetadata(contestRef, participant.ref);

			expect(metadata.confirmed_arrival).to.equal(
				JSON.parse(baseMetadata.metadata).confirmed_arrival
			);

			//Execute the reset contest division members API
			await request(options);

			// Check the contest user's metadata.confirmed_arrival AFTER the reset. It should be equal to NULL.
			contestData = await getContest(contestRef);
			metadata = await getContestUserMetadata(contestRef, participant.ref);
			expect(metadata.confirmed_arrival).to.equal(null);
		});

		/* Negative tests */

		it('should not be accessible using a [division team]', async () => {
			options.uri = signPath(`/contest/${division.ref}/reset-members`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [traditional team]', async () => {
			options.uri = signPath(`/contest/${traditionalTeam.data.ref}/reset-members`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using an [invalid contest ref]', async () => {
			let invalidRef = makeUniqueString();
			options.uri = signPath(`/contest/${invalidRef}/reset-members`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [non participant]', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(`/contest/${contestRef}/reset-members`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [non assigned participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/contest/${contestRef}/reset-members`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`/contest/${contestRef}/reset-members`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [contest admin] from another contest', async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(`/contest/${contestRef}/reset-members`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division leader] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(`/contest/${contestRef}/reset-members`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division member] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(`/contest/${contestRef}/reset-members`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
