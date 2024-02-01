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
	createDivisionMemberWithRole,
	createContestParticipant,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	createContest,
	createContestDivision,
	createContestCollection,
	createTraditionalTeam,
	createTraditionalImpression,
	importImpressionsForContestCollection,
	assignContestCollectionToDivision,
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
		divisionGuide,
		divisionLeader,
		divisionLeaderB,
		contestTeam,
		divisionA,
		divisionB,
		contestCollectionA,
		contestCollectionB,
		contestImpressionsA,
		contestImpressionsB,
		moldTastingsA,
		moldTastingsB,
		expectedMolds,
		expectedMoldStatements,
		traditionalTeam;

	const checkExportData = (exportData) => {
		expect(exportData).to.have.property('mold');
		expect(exportData).to.have.property('impressions');
		expect(exportData).to.have.property('statements');
		expect(exportData.mold).to.be.an('object');
		expect(exportData.impressions).to.be.an('array');
		expect(exportData.statements).to.be.an('array');
	};

	const checkExportImpression = (exportMold, mold = true) => {
		expect(exportMold).to.have.property('ref');
		expect(exportMold).to.have.property('team');
		expect(exportMold).to.have.property('collection');

		if (!mold) {
			expect(exportMold).to.have.property('creator');
			expect(exportMold.creator).to.have.property('ref');
			expect(exportMold.creator).to.have.property('email');
			expect(exportMold.creator).to.have.property('marked');
			expect(exportMold.creator).to.be.an('object');
			expect(exportMold.creator.ref).to.be.a('string');
			expect(exportMold.creator.ref).to.be.a('string');
			expect(exportMold.creator.marked).to.be.a('boolean');
		}
	};

	const checkExportStatement = (exportStatement) => {
		expect(exportStatement).to.have.property('marked_impression');
		expect(exportStatement).to.have.property('flag');
		expect(exportStatement).to.have.property('requested');
		expect(exportStatement).to.have.property('statement');
		expect(exportStatement).to.have.property('extra_a');
		expect(exportStatement).to.have.property('extra_b');
		expect(exportStatement).to.have.property('extra_c');
		expect(exportStatement).to.have.property('extra_d');
		expect(exportStatement).to.have.property('extra_e');
		expect(exportStatement).to.have.property('metadata');
		expect(exportStatement.marked_impression).to.be.a('string');
		expect(exportStatement.flag).to.be.a('boolean');
		expect(exportStatement.requested).to.be.a('boolean');
		expect(exportStatement.statement).to.be.a('string');
		expect(exportStatement.extra_a).to.be.a('string');
		expect(exportStatement.extra_b).to.be.a('string');
		expect(exportStatement.extra_c).to.be.a('string');
		expect(exportStatement.extra_d).to.be.a('string');
		expect(exportStatement.extra_e).to.be.a('string');
		expect(exportStatement.metadata).to.be.an('object');
	};

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		contestAdmin = generateUserData();
		contestAdminData = await createItem(createUserPath, contestAdmin);

		anotherContestAdmin = generateUserData();
		anotherContestAdminData = await createItem(createUserPath, anotherContestAdmin);

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		// Initialize Expectations
		expectedMolds = 0;
		expectedMoldStatements = [];
		moldTastingsA = [];
		moldTastingsB = [];

		// Simulate Login
		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Contest Team
		contestTeam = await createContest();

		// Create Division
		divisionA = await createContestDivision(contestTeam.data.ref);
		divisionB = await createContestDivision(contestTeam.data.ref);

		// Create Participant and Assign Leader Role
		divisionLeader = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			divisionA,
			'leader'
		);

		// Create Participant and Assign Leader Role
		divisionLeaderB = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			divisionB,
			'leader'
		);

		// Create Participant and Assign Guide Role
		divisionGuide = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			divisionA,
			'guide'
		);

		// Create Participant and Assign Member Role
		divisionMember = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			divisionA,
			'member'
		);

		// Create Participant without a Division and Role
		participant = await createContestParticipant(contestAdmin, contestTeam.data.ref, 'participant');

		// Create Collections
		contestCollectionA = await createContestCollection(contestTeam.data.ref);
		contestCollectionB = await createContestCollection(contestTeam.data.ref);

		// Import Impressions
		contestImpressionsA = await importImpressionsForContestCollection(
			contestTeam.data.ref,
			contestCollectionA.ref
		);

		contestImpressionsB = await importImpressionsForContestCollection(
			contestTeam.data.ref,
			contestCollectionB.ref
		);

		// Increment Expected Molds
		expectedMolds += contestImpressionsA.length;
		expectedMolds += contestImpressionsB.length;

		// Assign Collection to Division
		await assignContestCollectionToDivision(
			contestTeam.data.ref,
			contestCollectionA.ref,
			divisionA.ref
		);
		await assignContestCollectionToDivision(
			contestTeam.data.ref,
			contestCollectionB.ref,
			divisionB.ref
		);

		// Create Tastings out of Molds for Division A
		await login(divisionLeader.email, divisionLeader.rawPass);
		for (let i = 0; i < contestImpressionsA.length; i++) {
			let mold = contestImpressionsA[i];
			let tasting = await createTraditionalImpression({
				name: makeUniqueString(),
				collection: contestCollectionA.ref,
				team: divisionA.ref,
				mold: mold.ref,
			});
			moldTastingsA.push(tasting.data.ref);
		}

		// Add Statements using Tastings out of Molds for Division A
		for (let i = 0; i < moldTastingsA.length; i++) {
			expectedMoldStatements[contestImpressionsA[i].ref] = 0;

			let statement = await addDivisionStatement(
				contestTeam.data.ref,
				contestCollectionA.ref,
				divisionA.ref,
				contestImpressionsA[i].ref,
				{
					marked_impression: moldTastingsA[i],
					flag: true,
					requested: true,
					statement: makeUniqueString(),
					extra_a: makeUniqueString(),
					extra_b: makeUniqueString(),
					extra_c: makeUniqueString(),
					extra_d: makeUniqueString(),
					extra_e: makeUniqueString(),
					metadata: {
						medal: 'gold',
					},
				}
			);
			expectedMoldStatements[contestImpressionsA[i].ref]++;
		}

		// Create Tastings out of Molds for Division B
		await login(divisionLeaderB.email, divisionLeaderB.rawPass);
		for (let i = 0; i < contestImpressionsB.length; i++) {
			let mold = contestImpressionsB[i];
			let tasting = await createTraditionalImpression({
				name: makeUniqueString(),
				collection: contestCollectionB.ref,
				team: divisionB.ref,
				mold: mold.ref,
			});
			moldTastingsB.push(tasting.data.ref);
		}

		// Add Statements using Tastings out of Molds for Division B
		for (let i = 0; i < moldTastingsB.length; i++) {
			expectedMoldStatements[contestImpressionsB[i].ref] = 0;

			let statement = await addDivisionStatement(
				contestTeam.data.ref,
				contestCollectionB.ref,
				divisionB.ref,
				contestImpressionsB[i].ref,
				{
					marked_impression: moldTastingsB[i],
					flag: true,
					requested: true,
					statement: makeUniqueString(),
					extra_a: makeUniqueString(),
					extra_b: makeUniqueString(),
					extra_c: makeUniqueString(),
					extra_d: makeUniqueString(),
					extra_e: makeUniqueString(),
					metadata: {
						medal: 'gold',
					},
				}
			);

			expectedMoldStatements[contestImpressionsB[i].ref]++;
		}

		// Create Traditional Team
		await login(contestAdmin.email, contestAdmin.rawPass);
		traditionalTeam = await createTraditionalTeam();
	});

	describe('Export Results', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(`/contest/${contestTeam.data.ref}/result/export`);
		});

		/* Positive tests */

		it('should be successful and return proper data', async () => {
			let contestExport = await request(options);

			// Expect the correct number of molds imported into a collection
			expect(contestExport.data.length).to.equal(expectedMolds);

			for (let i = 0; i < contestExport.data.length; i++) {
				// Check export container
				let exportData = contestExport.data[i];
				checkExportData(exportData);

				// Check mold
				let exportMold = exportData.mold;
				checkExportImpression(exportMold, true);

				let exportMoldTastings = exportData.impressions;

				// Check mold tastings
				for (let i = 0; i < exportMoldTastings.length; i++) {
					let exportMoldTasting = exportMoldTastings[i];
					checkExportImpression(exportMoldTasting, false);

					// Expect the correct number of tastings out of molds
					if (exportMoldTasting.team == divisionA.ref) {
						expect(exportMoldTasting.creator.ref).to.equal(divisionLeader.ref);
						expect(exportMoldTasting.creator.email).to.equal(divisionLeader.email);
						expect(moldTastingsA.includes(exportMoldTasting.ref)).to.equal(true);
					}

					if (exportMoldTasting.team == divisionB.ref) {
						expect(exportMoldTasting.creator.ref).to.equal(divisionLeaderB.ref);
						expect(exportMoldTasting.creator.email).to.equal(divisionLeaderB.email);
						expect(moldTastingsB.includes(exportMoldTasting.ref)).to.equal(true);
					}
				}

				// Check Statements
				let exportStatements = exportData.statements;
				expect(exportStatements.length).to.equal(expectedMoldStatements[exportMold.ref]);
				for (let i = 0; i < exportStatements.length; i++) {
					let exportStatement = exportStatements[i];
					checkExportStatement(exportStatement);
				}
			}
		});

		/* Negative tests */

		it('should return an error using a traditional team (as contest)', async () => {
			options.uri = signPath(`/contest/${traditionalTeam.data.ref}/result/export`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error using a non-admin account [leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/result/export`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error using a non-admin account [guide]', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/result/export`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error using a non-admin account [member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/result/export`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error using a non-admin account [participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/result/export`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error using a non-admin account [non-participant]', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/result/export`);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
