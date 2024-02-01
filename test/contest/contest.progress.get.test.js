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
	createContest,
	createContestDivision,
	createContestCollection,
	createContestParticipant,
	assignContestCollectionToDivision,
	importImpressionsForContestCollection,
	createTraditionalImpression,
	createTraditionalTeam,
	createTraditionalCollection,
	addDivisionStatement,
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
		contestSubject,
		anotehrContestImpression,
		anotherContestTeam,
		anotherContestDivision,
		anotherContestCollection,
		anotherContestImpressions,
		anotherContestImpression,
		traditionalTeam,
		traditionalCollection,
		traditionalImpression,
		expectedStatements;

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

		// Create Division
		division = await createContestDivision(contestTeam.data.ref);

		// Create Another Division
		anotherDivision = await createContestDivision(contestTeam.data.ref);

		// Create Contest Collection
		contestCollection = await createContestCollection(contestTeam.data.ref);

		// Assign Contest Collection to Division
		await assignContestCollectionToDivision(
			contestTeam.data.ref,
			contestCollection.ref,
			division.ref
		);

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

		// Create Participant without a Division and Role
		participant = await createContestParticipant(contestAdmin, contestTeam.data.ref, 'participant');

		// Import Impressions to Collection
		contestImpressions = await importImpressionsForContestCollection(
			contestTeam.data.ref,
			contestCollection.ref
		);
		contestImpression = contestImpressions[0];

		// Create Impression subject
		await login(divisionLeader.email, divisionLeader.rawPass);
		contestSubject = await createTraditionalImpression({
			name: makeUniqueString(),
			mold: contestImpression.ref,
		});

		// Initialize statement count
		expectedStatements = 0;

		// Make a statement about an impression
		await addDivisionStatement(
			contestTeam.data.ref,
			contestCollection.ref,
			division.ref,
			contestImpression.ref,
			{
				marked_impression: contestSubject.data.ref,
				flag: true,
				request: true,
				statement: makeUniqueString(),
				extra_a: makeUniqueString(),
				extra_b: makeUniqueString(),
				extra_c: makeUniqueString(),
				extra_d: makeUniqueString(),
				extra_e: makeUniqueString(),
			}
		);

		// Increment statement count
		expectedStatements++;

		// Update that statement (same impression)
		await addDivisionStatement(
			contestTeam.data.ref,
			contestCollection.ref,
			division.ref,
			contestImpression.ref,
			{
				marked_impression: contestSubject.data.ref,
				flag: true,
				request: true,
				statement: makeUniqueString(),
				extra_a: makeUniqueString(),
				extra_b: makeUniqueString(),
				extra_c: makeUniqueString(),
				extra_d: makeUniqueString(),
				extra_e: makeUniqueString(),
			}
		);

		// Make another statement (null)
		await addDivisionStatement(
			contestTeam.data.ref,
			contestCollection.ref,
			division.ref,
			contestImpression.ref,
			{
				marked_impression: contestSubject.data.ref,
				flag: true,
				request: true,
				statement: null,
				extra_a: makeUniqueString(),
				extra_b: makeUniqueString(),
				extra_c: makeUniqueString(),
				extra_d: makeUniqueString(),
				extra_e: makeUniqueString(),
			}
		);

		// Create Another Contest Team
		await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
		anotherContestTeam = await createContest();

		// Create a Division that belongs to another Contest
		anotherContestDivision = await createContestDivision(anotherContestTeam.data.ref);

		// Create a Collection that belongs to Another Contest
		anotherContestCollection = await createContestCollection(anotherContestTeam.data.ref);

		// Assign Contest Collection from Another Contest to Another Contest Division
		await assignContestCollectionToDivision(
			anotherContestTeam.data.ref,
			anotherContestCollection.ref,
			anotherContestDivision.ref
		);

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

		// Import Impressions to Another Contest Collection
		anotherContestImpressions = await importImpressionsForContestCollection(
			anotherContestTeam.data.ref,
			anotherContestCollection.ref
		);
		anotherContestImpression = anotherContestImpressions[0];

		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();

		// Create Traditional Collection
		traditionalCollection = await createTraditionalCollection();

		// Create Traditional Impression
		traditionalImpression = await createTraditionalImpression();
	});

	describe('Progress', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(`/contest/${contestTeam.data.ref}/progress`);

			options.body = {
				flag: true,
				request: true,
				statement: makeUniqueString(),
				extra_a: makeUniqueString(),
				extra_b: makeUniqueString(),
				extra_c: makeUniqueString(),
				extra_d: makeUniqueString(),
				extra_e: makeUniqueString(),
			};
		});

		/* Positive tests */

		it('should be successful and return proper data', async () => {
			let response = await request(options);
			let collection = response.data.collections[0];
			expect(collection.ref).to.equal(contestCollection.ref);
			expect(collection.name).to.equal(contestCollection.name);
		});

		/* Negative tests */

		it('should not be accessible using a [traditional team]', async () => {
			options.uri = signPath(`/contest/${traditionalTeam.data.ref}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using an [invalid contest ref]', async () => {
			options.uri = signPath(`/contest/${makeUniqueString()}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [non participant]', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [non assigned participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [contest admin] from another contest', async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division leader] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division member] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
