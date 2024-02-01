const expect = require('chai').expect;
const request = require('request-promise');
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];
const _pluck = require('lodash').map;
const {
	baseUrl,
	baseGetOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	createDivisionMemberWithRole,
	createContest,
	createContestDivision,
	createContestCollection,
	importImpressionsForContestCollection,
	addContestStatementsToSubjects,
	createContestParticipant,
} = require('../common.js');

describe('Contest', () => {
	let options,
		user,
		userData,
		contestAdmin,
		contestAdminData,
		contestTeam,
		contestTeamRef,
		division,
		cavaTheme,
		redStilTheme,
		noSubjectsTheme,
		unusedTheme,
		goldStatement,
		silverStatement,
		collectionCavaSubjects,
		collectionRedStilSubjects,
		collectionCavaStatements,
		collectionRedStilStatements,
		participant,
		divisionLeader,
		divisionGuide,
		divisionMember;

	before(async () => {
		options = {...baseGetOptions};
		let createUserPath = baseUrl + '/user';

		// Create team contestAdmin
		contestAdmin = generateUserData();
		let contestAdminData = await createItem(createUserPath, contestAdmin);

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		// Simulate login
		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Contest Team
		contestTeam = await createContest();
		contestTeamRef = contestTeam.data.ref;

		// Create Contest Team Division
		division = await createContestDivision(contestTeamRef);

		let baseCollectionData = {
			name: makeUniqueString(),
			description: makeUniqueString(100),
		};

		let baseStatementData = {
			marked_impression: null,
			flag: true,
			requested: true,
			extra_a: makeUniqueString(),
			extra_b: makeUniqueString(),
			extra_c: makeUniqueString(),
			extra_d: makeUniqueString(),
			extra_e: makeUniqueString(),
			metadata: {
				field: 'value',
			},
		};

		// Create collections for "Cava" and "Red Stil" themes
		cavaTheme = Object.assign({theme: 'Cava'}, baseCollectionData);
		redStilTheme = Object.assign({theme: 'Red Stil'}, baseCollectionData);
		noSubjectsTheme = Object.assign({theme: 'no subjects'}, baseCollectionData);
		unusedTheme = Object.assign({theme: 'unused'}, baseCollectionData);
		let collectionCava = await createContestCollection(contestTeamRef, cavaTheme);
		let collectionRedStil = await createContestCollection(contestTeamRef, redStilTheme);
		let collectionNoSubjects = await createContestCollection(contestTeamRef, noSubjectsTheme);

		// Import test subjects/impressions into collectionCava
		collectionCavaSubjects = await importImpressionsForContestCollection(
			contestTeamRef,
			collectionCava.ref
		);

		// Import test subjects/impressions into collectionRedStil
		collectionRedStilSubjects = await importImpressionsForContestCollection(
			contestTeamRef,
			collectionRedStil.ref
		);

		// Now add statements for each subject for collectionCava
		goldStatement = Object.assign({statement: 'gold'}, baseStatementData);
		silverStatement = Object.assign({statement: 'silver'}, baseStatementData);

		// Assign gold statement to all collectionCavaSubjects
		collectionCavaStatements = await addContestStatementsToSubjects(
			contestTeamRef,
			collectionCava.ref,
			collectionCavaSubjects,
			goldStatement
		);

		// Assign silver statement to all collectionRedStilSubjects
		collectionRedStilStatements = await addContestStatementsToSubjects(
			contestTeamRef,
			collectionRedStil.ref,
			collectionRedStilSubjects,
			silverStatement
		);

		// Add different unauthorized user for negative tests
		participant = await createContestParticipant(contestAdmin, contestTeamRef);

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
	});

	describe('Admin Statement Summary', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(`/contest/${contestTeamRef}/summary/statements/admin`, 'GET');
		});

		/* Positive tests */

		it('should be successful and return proper data', async () => {
			let response = await request(options);
			let statementSummary = response.data;
			let summaryThemes = _pluck(statementSummary, 'theme');

			// Base themes must be included in the summary
			expect(summaryThemes.includes(cavaTheme.theme)).to.equal(true);
			expect(summaryThemes.includes(redStilTheme.theme)).to.equal(true);
			expect(summaryThemes.includes(noSubjectsTheme.theme)).to.equal(true);

			// Unused theme (meaning any contest collection didn't possess it as a theme) must not be included in the summary themes
			expect(summaryThemes.includes(unusedTheme.theme)).to.equal(false);

			for (const summary of statementSummary) {
				let theme = summary.theme;
				let statements = summary.statements;
				let statementKeys = Object.keys(statements);

				// Check correct data for the cava theme
				if (theme == cavaTheme.theme) {
					// gold statement was added to the cava theme but not the silver statement
					expect(statementKeys.includes(goldStatement.statement)).to.equal(true);
					expect(statementKeys.includes(silverStatement.statement)).to.not.equal(true);

					// Make sure that the correct subjects are reflected on the correct statement
					for (const statement of statementKeys) {
						// Since gold statement was assigned to collectionCavaSubjects, they must exist exist as subjects for the gold statement
						if (statement == 'gold') {
							let statementSubjects = statements[statement];
							let statementSubjectsRefs = _pluck(statementSubjects, 'ref');

							for (const cavaSubject of collectionCavaSubjects) {
								expect(statementSubjectsRefs.includes(cavaSubject.ref)).to.equal(true);
							}
						}
					}
				}

				// Check correct data for the red stil theme
				if (theme == redStilTheme.theme) {
					// silver statement was added to the red stil theme but not the gold statement
					expect(Object.keys(statements).includes(silverStatement.statement)).to.equal(true);
					expect(Object.keys(statements).includes(goldStatement.statement)).to.not.equal(true);

					// Make sure that the correct subjects are reflected on the correct statement
					for (const statement of statementKeys) {
						// Since gold statement was assigned to collectionRedStilSubjects, they must exist exist as subjects for the gold statement
						if (statement == 'silver') {
							let statementSubjects = statements[statement];
							let statementSubjectsRefs = _pluck(statementSubjects, 'ref');

							for (const redStilSubject of collectionRedStilSubjects) {
								expect(statementSubjectsRefs.includes(redStilSubject.ref)).to.equal(true);
							}
						}
					}
				}

				// Since there are no subjects added into the theme, which also implies that no statements added, the summary statements should be empty
				if (theme == noSubjectsTheme.theme) {
					expect(Object.keys(statements).length).to.equal(0);
				}
			}
		});

		/* Negative tests */
		it('should return an error for non-existing or invalid contest', async () => {
			let invalidContestRef = makeUniqueString();
			options.uri = signPath(`/contest/${invalidContestRef}/summary/statements/admin`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/summary/statements/admin`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/summary/statements/admin`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [division guide]', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/summary/statements/admin`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/summary/statements/admin`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
