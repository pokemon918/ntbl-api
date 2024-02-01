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
	assignContestCollectionToDivision,
	importImpressionsForContestCollection,
} = require('../common.js');

describe('Contest', () => {
	let options,
		contestAdmin,
		contestAdminData,
		nonParticipant,
		nonParticipantData,
		participant,
		divisionLeader,
		divisionGuide,
		divisionMember,
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

	const checkCollection = (collection, contestCollection) => {
		expect(collection.ref).to.equal(contestCollection.ref);
		expect(collection.name).to.equal(contestCollection.name);
		expect(collection.theme).to.equal(contestCollection.theme);
		expect(collection.metadata).to.deep.equal(contestCollection.metadata);
		expect(collection.start_date).to.equal(contestCollection.start_date);
		expect(collection.end_date).to.equal(contestCollection.end_date);
	};

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		contestAdmin = generateUserData();
		contestAdminData = await createItem(createUserPath, contestAdmin);

		nonParticipant = generateUserData();
		nonParticipantData = await createItem(createUserPath, nonParticipant);

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

		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Another Contest Team
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
			contestAdmin,
			anotherContestTeam,
			anotherContestDivision,
			'leader'
		);

		// Create Participant and Assign Member Role
		anotherContestDivisionMember = await createDivisionMemberWithRole(
			contestAdmin,
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

		// Refresh Contest Collection
		let refreshResponse = await getContest(contestTeam.data.ref);
		contestCollection = refreshResponse.data.collections[0];
	});

	describe('Get Collection using Contest Related Users', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(`/event/${contestCollection.ref}`);
		});

		/* Positive tests */

		it('should be successful and return proper data for [contest admin]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			let collection = await request(options);
			checkCollection(collection, contestCollection);
		});

		it('should be successful and return proper data for [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`/event/${contestCollection.ref}`);
			let collection = await request(options);
			checkCollection(collection, contestCollection);
		});

		it('should be successful and return proper data for [division guide]', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(`/event/${contestCollection.ref}`);
			let collection = await request(options);
			checkCollection(collection, contestCollection);
		});

		it('should be successful and return proper data for [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`/event/${contestCollection.ref}`);
			let collection = await request(options);
			checkCollection(collection, contestCollection);
		});

		it('should flag a collection impression when tasted [contest admin]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);

			options.method = 'POST';
			options.uri = signPath(`/tasting`, 'POST');
			options.body = {
				name: makeUniqueString(),
				collection: contestCollection.ref,
				mold: contestImpression.ref,
			};
			let subject = await request(options);

			options.method = 'GET';
			options.uri = signPath(`/event/${contestCollection.ref}`);
			let collection = await request(options);
			let tastings = collection.tastings;

			for (let i = 0; i < tastings.length; i++) {
				let tasting = tastings[i];

				if (tasting.ref == subject.data.mold) {
					expect(tasting.existing_user_impression).to.equal(true);
					continue;
				}

				expect(tasting.existing_user_impression).to.equal(false);
			}
		});

		it('should flag a collection impression when tasted [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);

			options.method = 'POST';
			options.uri = signPath(`/tasting`, 'POST');
			options.body = {
				name: makeUniqueString(),
				collection: contestCollection.ref,
				mold: contestImpression.ref,
			};
			let subject = await request(options);

			options.method = 'GET';
			options.uri = signPath(`/event/${contestCollection.ref}`);
			let collection = await request(options);
			let tastings = collection.tastings;

			for (let i = 0; i < tastings.length; i++) {
				let tasting = tastings[i];

				if (tasting.ref == subject.data.mold) {
					expect(tasting.existing_user_impression).to.equal(true);
					continue;
				}

				expect(tasting.existing_user_impression).to.equal(false);
			}
		});

		it('should flag a collection impression when tasted [division guide]', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);

			options.method = 'POST';
			options.uri = signPath(`/tasting`, 'POST');
			options.body = {
				name: makeUniqueString(),
				collection: contestCollection.ref,
				mold: contestImpression.ref,
			};
			let subject = await request(options);

			options.method = 'GET';
			options.uri = signPath(`/event/${contestCollection.ref}`);
			let collection = await request(options);
			let tastings = collection.tastings;

			for (let i = 0; i < tastings.length; i++) {
				let tasting = tastings[i];

				if (tasting.ref == subject.data.mold) {
					expect(tasting.existing_user_impression).to.equal(true);
					continue;
				}

				expect(tasting.existing_user_impression).to.equal(false);
			}
		});

		it('should flag a collection impression when tasted [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);

			options.method = 'POST';
			options.uri = signPath(`/tasting`, 'POST');
			options.body = {
				name: makeUniqueString(),
				collection: contestCollection.ref,
				mold: contestImpression.ref,
			};
			let subject = await request(options);

			options.method = 'GET';
			options.uri = signPath(`/event/${contestCollection.ref}`);
			let collection = await request(options);
			let tastings = collection.tastings;

			for (let i = 0; i < tastings.length; i++) {
				let tasting = tastings[i];

				if (tasting.ref == subject.data.mold) {
					expect(tasting.existing_user_impression).to.equal(true);
					continue;
				}

				expect(tasting.existing_user_impression).to.equal(false);
			}
		});

		/* Negative tests */

		it('should not be able to access using a [non participant] account', async () => {
			await login(nonParticipant.email, nonParticipant.rawPass);
			options.uri = signPath(`/event/${contestCollection.ref}`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to access using a [unassigned] account', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/event/${contestCollection.ref}`);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
