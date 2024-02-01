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
	checkContestStatement,
	getContest,
	createContest,
	createContestDivision,
	createContestCollection,
	createContestParticipant,
	assignContestCollectionToDivision,
	importImpressionsForContestCollection,
	createTraditionalImpression,
	createTraditionalTeam,
	createTraditionalCollection,
} = require('../common.js');

describe('Contest', () => {
	let options,
		creator,
		creatorData,
		user,
		userData,
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
		contestSubject,
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

		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		await login(creator.email, creator.rawPass);

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
		divisionLeader = await createDivisionMemberWithRole(creator, contestTeam, division, 'leader');

		// Create Participant and Assign Guide Role
		divisionGuide = await createDivisionMemberWithRole(creator, contestTeam, division, 'guide');

		// Create Participant and Assign Member Role
		divisionMember = await createDivisionMemberWithRole(creator, contestTeam, division, 'member');

		// Create Participant and Assign Member Role (Same Contest, Another Division)
		anotherDivisionLeader = await createDivisionMemberWithRole(
			creator,
			contestTeam,
			anotherDivision,
			'leader'
		);

		// Create Participant and Assign Member Role (Same Contest, Another Division)
		anotherDivisionMember = await createDivisionMemberWithRole(
			creator,
			contestTeam,
			anotherDivision,
			'member'
		);

		// Create Participant without a Division and Role
		participant = await createContestParticipant(creator, contestTeam.data.ref, 'participant');

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

		// Create Another Contest Team
		await login(creator.email, creator.rawPass);
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
			creator,
			anotherContestTeam,
			anotherContestDivision,
			'leader'
		);

		// Create Participant and Assign Member Role
		anotherContestDivisionMember = await createDivisionMemberWithRole(
			creator,
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

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();

		// Create Traditional Collection
		traditionalCollection = await createTraditionalCollection();

		// Create Traditional Impression
		traditionalImpression = await createTraditionalImpression();

		await login(divisionLeader.email, divisionLeader.rawPass);
	});

	describe('Division Team making a statement about an impression', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);

			options.body = {
				marked_impression: contestSubject.data.ref,
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
			};
		});

		/* Positive tests */

		it('should be successful and return proper data upon insert if user is [contest admin]', async () => {
			await login(creator.email, creator.rawPass); //by default, the creator is also an admin
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			let statementInput = options.body;
			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let responseDivision = updatedContest.data.teams.find((dt) => {
				return dt.ref === division.ref;
			});

			expect(responseDivision.statements.length).to.equal(1);
			let responseStatement = responseDivision.statements[0];
			checkContestStatement(responseStatement, statementInput);
		});

		it('should be successful and return proper data upon insert if user is [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			let statementInput = options.body;

			await login(creator.email, creator.rawPass);
			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let responseDivision = updatedContest.data.teams.find((dt) => {
				return dt.ref === division.ref;
			});

			expect(responseDivision.statements.length).to.equal(1);
			let responseStatement = responseDivision.statements[0];
			checkContestStatement(responseStatement, statementInput);
		});

		it('should be able to update the statement', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);

			let statementInput = options.body;
			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let responseDivision = updatedContest.data.teams.find((dt) => {
				return dt.ref === division.ref;
			});

			expect(responseDivision.statements.length).to.equal(1);
			let responseStatement = responseDivision.statements[0];
			checkContestStatement(responseStatement, statementInput);
		});

		it('should be able to save metadata with a standard json input', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);

			options.body.metadata = {
				medal: 'gold',
			};

			let statementInput = options.body;
			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let responseDivision = updatedContest.data.teams.find((dt) => {
				return dt.ref === division.ref;
			});

			expect(responseDivision.statements.length).to.equal(1);
			let responseStatement = responseDivision.statements[0];
			checkContestStatement(responseStatement, statementInput);
		});

		it('should be able to save metadata with a stringified hjson input', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);

			// No quotes, no comma separator , trailing comma
			options.body.metadata = "{medal_page:true \n 'views': 1000 , }";

			// Simulate HJSON Parser
			let expectedJson = {
				medal_page: true,
				views: 1000,
			};

			let statementInput = options.body;
			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let responseDivision = updatedContest.data.teams.find((dt) => {
				return dt.ref === division.ref;
			});

			expect(responseDivision.statements.length).to.equal(1);
			let responseStatement = responseDivision.statements[0];
			expect(responseStatement.metadata).to.deep.equal(expectedJson);
		});

		/* Negative tests */

		it('should not be able to make a statement using a traditional team (as contest)', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to make a statement using a traditional team (as division)', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${traditionalTeam.data.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to make a statement using a traditional collection', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${traditionalCollection.data.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to make a statement using a traditional impression', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${traditionalImpression.data.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to make a statement using a invalid team (as contest)', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${makeUniqueString()}/collection/${contestCollection.ref}/team/${
					division.ref
				}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to make a statement using a invalid team (as division)', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${
					contestCollection.ref
				}/team/${makeUniqueString()}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to make a statement using a invalid collection', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${makeUniqueString()}/team/${
					division.ref
				}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to make a statement using a invalid impression', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${
					division.ref
				}/subject/${makeUniqueString()}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload is empty', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body = {};
			``;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload is null', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload is an array', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [flag] is a string', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.flag = makeUniqueString();
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [flag] is a number', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.flag = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [request] is a string', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.requested = makeUniqueString();
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [request] is a number', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.requested = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [statement] exceeds 32 char limit', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.statement = makeUniqueString(33);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_a] exceeds 32 char limit', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_a = makeUniqueString(33);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_b] exceeds 32 char limit', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_b = makeUniqueString(33);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_c] exceeds 32 char limit', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_c = makeUniqueString(33);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_d] exceeds 32 char limit', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_d = makeUniqueString(33);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_e] exceeds 32 char limit', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_e = makeUniqueString(33);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [statement] is a bool', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.statement = false;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_a] is a bool', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_a = false;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_b] is a bool', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_b = false;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_c] is a bool', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_c = false;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_d] is a bool', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_d = false;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_e] is a bool', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_e = false;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [statement] is a number', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.statement = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_a] is a number', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_a = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_b] is a number', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_b = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_c] is a number', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_c = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_d] is a number', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_d = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_e] is a number', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_e = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [statement] is an array', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.statement = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_a] is an array', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_a = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_b] is an array', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_b = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_c] is an array', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_c = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_d] is an array', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_d = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [extra_e] is an array', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.extra_e = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [metadata] is an invalid hjson string', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.metadata = '"{"medal":"gold1"}}"';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [metadata] is an integer', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.metadata = 1000;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [metadata] is a float', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.body.metadata = 1.5;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the [sub entities] does not belong to the contest', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${anotherContestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the [collection] does not belong to the contest', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${anotherContestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the [division] does not belong to the contest', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${anotherContestDivision.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the [impression] does not belong to the collection', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${anotherContestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is not a participant', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is an [unassigned participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is a [guide]', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is a [member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is a [leader] from the same contest but another division', async () => {
			await login(anotherDivisionLeader.email, anotherDivisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is a [member] from the same contest but another division', async () => {
			await login(anotherDivisionMember.email, anotherDivisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is a [leader] from another contest', async () => {
			await login(anotherContestDivisionLeader.email, anotherContestDivisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is a [member] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the [subject] is not related to the contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${traditionalImpression.data.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the [subject] is from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${anotherContestCollection.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the [marked_impression] is not related to the contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.body.marked_impression = traditionalImpression.data.ref;
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the [marked_impression] is from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.body.marked_impression = anotherContestImpression.ref;
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/subject/${contestImpression.ref}/statement`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
