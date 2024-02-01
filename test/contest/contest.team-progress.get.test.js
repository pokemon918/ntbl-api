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
	addDivisionStatementsToSubjects,
	createContestParticipant,
	assignContestCollectionToDivision,
	addContestStatementsToSubjects,
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
		divisionRef,
		collectionCavaA,
		collectionCavaB,
		collectionCavaC,
		collectionCavaD, // will only be used to test contestRef
		collectionCavaData,
		collectionRedStilA,
		collectionRedStilB,
		collectionRedStilC, // will only be used to test contestRef
		collectionRedStilData,
		noSubjectsTheme,
		unusedTheme,
		goldStatement,
		silverStatement,
		collectionCavaASubjects,
		collectionCavaBSubjects,
		collectionCavaCSubjects,
		collectionCavaDSubjects,
		collectionRedStilASubjects,
		collectionRedStilBSubjects,
		collectionRedStilCSubjects,
		collectionCavaAStatements,
		collectionCavaBStatements,
		collectionRedStilAStatements,
		participant,
		divisionLeader,
		divisionGuide,
		divisionMember,
		checkExpectedProgress,
		divisionExpectedOutput;

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
		divisionRef = division.ref;

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

		/*
		|--------------------------------------------------------------------------
		| Create collections with different themes
		|--------------------------------------------------------------------------		
		*/

		// Create 3 collections with "Cava" themes
		collectionCavaData = Object.assign({theme: 'Cava'}, baseCollectionData);
		collectionCavaA = await createContestCollection(contestTeamRef, collectionCavaData);
		collectionCavaB = await createContestCollection(contestTeamRef, collectionCavaData);
		collectionCavaC = await createContestCollection(contestTeamRef, collectionCavaData);
		collectionCavaD = await createContestCollection(contestTeamRef, collectionCavaData); // Add an additional collection to have different total for contestRef

		// Create 2 collections with "Red Stil" themes
		collectionRedStilData = Object.assign({theme: 'Red Stil'}, baseCollectionData);
		collectionRedStilA = await createContestCollection(contestTeamRef, collectionRedStilData);
		collectionRedStilB = await createContestCollection(contestTeamRef, collectionRedStilData);
		collectionRedStilC = await createContestCollection(contestTeamRef, collectionRedStilData); // Add an additional collection to have different total for contestRef

		/*
		|--------------------------------------------------------------------------
		| Assign all collections (cava and red stil) to the division
		|--------------------------------------------------------------------------		
		*/
		await assignContestCollectionToDivision(contestTeamRef, collectionCavaA.ref, divisionRef);
		await assignContestCollectionToDivision(contestTeamRef, collectionCavaB.ref, divisionRef);
		await assignContestCollectionToDivision(contestTeamRef, collectionCavaC.ref, divisionRef);
		await assignContestCollectionToDivision(contestTeamRef, collectionRedStilA.ref, divisionRef);
		await assignContestCollectionToDivision(contestTeamRef, collectionRedStilB.ref, divisionRef);
		// Note: Do not assign collectionCavaD and collectionRedStilC to division to vary total for sending contestRef

		/*
		|--------------------------------------------------------------------------
		| Import subjects/molds to Cava collections;
		| Note: Each call to importImpressionsForContestCollection will produce 3 subjects
		| Since there are 3 cava collection  and each collection imports 3 subjects, there should be a total of "9" subjects/molds
		|--------------------------------------------------------------------------		
		*/
		collectionCavaASubjects = await importImpressionsForContestCollection(
			contestTeamRef,
			collectionCavaA.ref
		);

		collectionCavaBSubjects = await importImpressionsForContestCollection(
			contestTeamRef,
			collectionCavaB.ref
		);

		collectionCavaCSubjects = await importImpressionsForContestCollection(
			contestTeamRef,
			collectionCavaC.ref
		);

		collectionCavaDSubjects = await importImpressionsForContestCollection(
			contestTeamRef,
			collectionCavaD.ref
		);

		/*
		|--------------------------------------------------------------------------
		| Import subjects/molds to Red stil collections
		| Note: Each call to importImpressionsForContestCollection will produce 3 subjects
		| Since there are 2 red stil collections and each collection imports 3 subjects, there should be a total of "6" subjects/molds
		|--------------------------------------------------------------------------		
		*/
		collectionRedStilASubjects = await importImpressionsForContestCollection(
			contestTeamRef,
			collectionRedStilA.ref
		);

		collectionRedStilBSubjects = await importImpressionsForContestCollection(
			contestTeamRef,
			collectionRedStilB.ref
		);

		collectionRedStilCSubjects = await importImpressionsForContestCollection(
			contestTeamRef,
			collectionRedStilC.ref
		);

		/*
		|--------------------------------------------------------------------------
		| Add statements for Cava subjects
		| Note: Statements will be made for all subjects under CavaA and CavaB collections which means there should be a total of "6" done		
		|--------------------------------------------------------------------------		
		*/

		// Initialize statement base data
		goldStatement = Object.assign({statement: 'gold'}, baseStatementData);
		silverStatement = Object.assign({statement: 'silver'}, baseStatementData);

		// Make DIVISION statements for all collectionCavaASubjects (contains 3 subjects)
		collectionCavaAStatements = await addDivisionStatementsToSubjects(
			contestTeamRef,
			collectionCavaA.ref,
			divisionRef,
			collectionCavaASubjects,
			goldStatement
		);

		// Make DIVISION statements for all collectionCavaBSubjects (contains 3 subjects)
		collectionCavaBStatements = await addDivisionStatementsToSubjects(
			contestTeamRef,
			collectionCavaB.ref,
			divisionRef,
			collectionCavaBSubjects,
			goldStatement
		);

		/*
		|--------------------------------------------------------------------------
		| Add statements for Red Stil Subjects
		| Note: Statements will be made for all subjects under RedStilA which means there should be a total of "3" done	
		|--------------------------------------------------------------------------		
		*/
		collectionRedStilAStatements = await addDivisionStatementsToSubjects(
			contestTeamRef,
			collectionRedStilA.ref,
			divisionRef,
			collectionRedStilASubjects,
			silverStatement
		);

		/*
		|--------------------------------------------------------------------------
		| Create users with different roles
		|--------------------------------------------------------------------------		
		*/

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

		checkExpectedProgress = (progress, expectedOutput) => {
			let expectedThemes = Object.keys(expectedOutput);
			expect(progress).to.not.equal(null);

			for (const theme in progress) {
				// progress themes should be included in the expected themes
				expect(expectedThemes.includes(theme)).to.equal(true);

				// The expected "done" value must be equal to the progress "done" value per theme
				expect(expectedOutput[theme].done).to.equal(progress[theme].done);

				// The expected "total" value must be equal to the progress "total" value per theme
				expect(expectedOutput[theme].total).to.equal(progress[theme].total);
			}
		};

		// Init the base expected output
		divisionExpectedOutput = [
			{
				theme: 'Cava',
				total: 9,
				todo: 3,
				done: 6,
			},
			{
				theme: 'Red Stil',
				total: 6,
				todo: 3,
				done: 3,
			},
		];
	});

	describe('Get Team Progress', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(`/contest/${contestTeamRef}/team/${divisionRef}/progress`);
		});

		/* Positive tests */
		it('should be successful and return proper data when using [divisionRef]', async () => {
			/*
			|--------------------------------------------------------------------------------------------------
			| Based on the initialized data above, the team progress is expected to have the following data
			| - Two themes. Cava and Red Stil
			| - Cava should have a "total" of 9 subjects and a "done" of 6 subjects
			| - Red Stil should have a "total" of 6 subjects and a "done" of 3 subjects
			|--------------------------------------------------------------------------------------------------
			*/

			let response = await request(options);
			let progress = response.data;
			checkExpectedProgress(progress, divisionExpectedOutput);
		});

		it('should be successful and return proper data when using [contestRef]', async () => {
			/*
			|----------------------------------------------------------------------------------------------------------------------------------------------------
			| Note: 
			| Adding a contest statement is different from adding a division statement. In fact they use different API. 
			| addContestStatementsToSubjects vs addDivisionStatementsToSubjects
			| In this specific test, addContestStatementsToSubjects is used instead of addDivisionStatementsToSubjects to prove that the API supports contestRef
			| To make the test more robust, we will be adding a different number of done to both the Cava and Red stil collections
			| Intead of 6 and 3, it will be 3 and 6 for Cava and Red Stil
			|----------------------------------------------------------------------------------------------------------------------------------------------------
			*/

			await login(contestAdmin.email, contestAdmin.rawPass);

			/*
			|--------------------------------------------------------------------------
			| Add CONTEST statements for Cava Subjects
			| Note: Statements will be made for all subjects under Cava which means there should be a total of "3" done	
			|--------------------------------------------------------------------------		
			*/
			await addContestStatementsToSubjects(
				contestTeamRef,
				collectionCavaA.ref,
				collectionCavaASubjects,
				goldStatement
			);

			/*
			|--------------------------------------------------------------------------
			| Add CONTEST statements for Red Stil Subjects
			| Note: Statements will be made for all subjects under RedStilA which means there should be a total of "6" done	
			|--------------------------------------------------------------------------		
			*/
			await addContestStatementsToSubjects(
				contestTeamRef,
				collectionRedStilA.ref,
				collectionRedStilASubjects,
				silverStatement
			);

			await addContestStatementsToSubjects(
				contestTeamRef,
				collectionRedStilB.ref,
				collectionRedStilBSubjects,
				silverStatement
			);

			options.uri = signPath(`/contest/${contestTeamRef}/team/${contestTeamRef}/progress`);
			let response = await request(options);
			let progress = response.data;

			/*
			|-------------------------------------------------------------------------------------------------------------------------------------
			| On the "before", we've added an additional collection for both Cava and Red still which we have imported 3 subjects each, there we add to the total of Cava and Redstil.
			| Please note that this will only be reflected because we use contestRef to access the team progress e.g. `/contest/${contestTeamRef}/team/${contestTeamRef}/progress`
			| Therefore we have a different expected output when accessing the API using contestTeamRef compared to divisionRef
			|-------------------------------------------------------------------------------------------------------------------------------------
			*/
			let contestExpectedOutput = [
				{
					theme: 'Cava',
					total: 12,
					todo: 9,
					done: 3,
				},
				{
					theme: 'Red Stil',
					total: 9,
					todo: 3,
					done: 6,
				},
			];

			checkExpectedProgress(progress, contestExpectedOutput);
		});

		it('should be accessible to a [contest admin]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/team/${divisionRef}/progress`);
			let response = await request(options);
			let progress = response.data;

			let divisionExpectedOutput = [
				{
					theme: 'Cava',
					total: 9,
					todo: 3,
					done: 6,
				},
				{
					theme: 'Red Stil',
					total: 6,
					todo: 3,
					done: 3,
				},
			];

			checkExpectedProgress(progress, divisionExpectedOutput);
		});

		/* Negative tests */
		it('should return an error for non-existing or invalid contest', async () => {
			let invalidContestRef = makeUniqueString();
			options.uri = signPath(`/contest/${invalidContestRef}/team/${divisionRef}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/team/${divisionRef}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/team/${divisionRef}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [division guide]', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/team/${divisionRef}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/team/${divisionRef}/progress`);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
