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
	checkForSuccess,
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
	assignContestCollectionToDivision,
	createTraditionalImpression,
	addDivisionStatement,
	addContestStatement,
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
		collection,
		collectionImpressions,
		impressionMold,
		moldedImpression,
		participant,
		divisionLeader,
		divisionGuide,
		divisionMember,
		baseStatementData,
		checkStatementData,
		compareStatementData;

	before(async () => {
		options = {...baseGetOptions};
		let createUserPath = baseUrl + '/user';

		// Create Contest Admin
		contestAdmin = generateUserData();
		let contestAdminData = await createItem(createUserPath, contestAdmin);

		// Simulate login
		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Contest Team
		contestTeam = await createContest();
		contestTeamRef = contestTeam.data.ref;

		// Create Contest Team Division
		division = await createContestDivision(contestTeamRef);

		// Create Contest Collection
		collection = await createContestCollection(contestTeamRef, {
			name: makeUniqueString(),
			description: makeUniqueString(100),
			theme: 'blind',
			metadata: {
				medal: 'gold',
			},
		});

		// Assign Collection to Division
		await assignContestCollectionToDivision(contestTeamRef, collection.ref, division.ref);

		// Import Collection Impressions
		collectionImpressions = await importImpressionsForContestCollection(
			contestTeamRef,
			collection.ref
		);

		// Use one of the Imports as Mold
		impressionMold = collectionImpressions[0];

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

		// Create Participating User
		participant = await createContestParticipant(contestAdmin, contestTeamRef);

		// Create Non-Participating User
		user = generateUserData();
		userData = await createItem(createUserPath, user);

		// Create Tasting based from Mold
		await login(divisionLeader.email, divisionLeader.rawPass);
		moldedImpression = await createTraditionalImpression({
			name: makeUniqueString(),
			producer: 'Riesling',
			country: 'Denmark',
			region: 'Hovedstaden',
			vintage: '1944',
			price: '199.9900',
			currency: 'DKK',
			clean_key: 'cln',
			producer_key: 'rslng',
			region_key: 'hvdstdn',
			summary_wine: 'This wine is is...',
			summary_personal: 'My personal experience with this is...',
			food_pairing: 'Pairs well with cheddar cheese.',
			mold: impressionMold.ref,
		});

		moldedImpression = moldedImpression.data;

		// Create Division Statement
		await login(divisionLeader.email, divisionLeader.rawPass);

		baseStatementData = {
			marked_impression: moldedImpression.ref,
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

		await addDivisionStatement(
			contestTeamRef,
			collection.ref,
			division.ref,
			impressionMold.ref,
			baseStatementData
		);

		checkStatementData = (statementData) => {
			// Check for property existence
			expect(statementData).to.have.property('theme');
			expect(statementData).to.have.property('statement');
			expect(statementData).to.have.property('extra_a');
			expect(statementData).to.have.property('extra_b');
			expect(statementData).to.have.property('extra_c');
			expect(statementData).to.have.property('extra_d');
			expect(statementData).to.have.property('extra_e');
			expect(statementData).to.have.property('name');
			expect(statementData).to.have.property('producer');
			expect(statementData).to.have.property('country');
			expect(statementData).to.have.property('region');
			expect(statementData).to.have.property('vintage');
			expect(statementData).to.have.property('grape');
			expect(statementData).to.have.property('price');
			expect(statementData).to.have.property('currency');
			expect(statementData).to.have.property('clean_key');
			expect(statementData).to.have.property('producer_key');
			expect(statementData).to.have.property('region_key');

			// Check for correct data type
			expect(statementData.theme).to.be.a('string');
			expect(statementData.statement).to.be.a('string');
			expect(statementData.extra_a).to.be.a('string');
			expect(statementData.extra_b).to.be.a('string');
			expect(statementData.extra_c).to.be.a('string');
			expect(statementData.extra_d).to.be.a('string');
			expect(statementData.extra_e).to.be.a('string');
			expect(statementData.name).to.be.a('string');
			expect(statementData.producer).to.be.a('string');
			expect(statementData.country).to.be.a('string');
			expect(statementData.region).to.be.a('string');
			expect(statementData.vintage).to.be.a('string');
			expect(statementData.grape).to.be.a('string');
			expect(statementData.price).to.be.a('string');
			expect(statementData.currency).to.be.a('string');
			expect(statementData.clean_key).to.be.a('string');
			expect(statementData.producer_key).to.be.a('string');
			expect(statementData.region_key).to.be.a('string');
		};

		compareStatementData = (statementData) => {
			expect(statementData.theme).to.equal(collection.theme);
			expect(statementData.statement).to.equal(baseStatementData.statement);
			expect(statementData.extra_a).to.equal(baseStatementData.extra_a);
			expect(statementData.extra_b).to.equal(baseStatementData.extra_b);
			expect(statementData.extra_c).to.equal(baseStatementData.extra_c);
			expect(statementData.extra_d).to.equal(baseStatementData.extra_d);
			expect(statementData.extra_e).to.equal(baseStatementData.extra_e);
			expect(statementData.name).to.equal(impressionMold.name);
			expect(statementData.producer).to.equal(impressionMold.producer);
			expect(statementData.country).to.equal(impressionMold.country);
			expect(statementData.region).to.equal(impressionMold.region);
			expect(statementData.vintage).to.equal(impressionMold.vintage);
			expect(statementData.grape).to.equal(impressionMold.grape);
			expect(parseFloat(statementData.price).toFixed(2)).to.equal(impressionMold.price.toString());
			expect(statementData.currency).to.equal(impressionMold.currency);
			expect(statementData.clean_key).to.equal(impressionMold.clean_key);
			expect(statementData.producer_key).to.equal(impressionMold.producer_key);
			expect(statementData.region_key).to.equal(impressionMold.region_key);
		};
	});

	describe('Team Statement Summary', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(
				`/contest/${contestTeamRef}/team/${division.ref}/statements/summary`,
				'GET'
			);
		});

		/* Positive tests */
		it('should be successful and return proper data', async () => {
			let response = await request(options);
			checkForSuccess(response);
			checkStatementData(response.data[0]);
			compareStatementData(response.data[0]);
		});

		it('should be successful even with empty data', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			let anotherDivision = await createContestDivision(contestTeamRef);
			options.uri = signPath(
				`/contest/${contestTeamRef}/team/${anotherDivision.ref}/statements/summary`,
				'GET'
			);
			let response = await request(options);
			checkForSuccess(response);
		});

		/* Negative tests */
		it('should return an error for non-existing or invalid contest', async () => {
			let invalidContestRef = makeUniqueString();
			options.uri = signPath(
				`/contest/${invalidContestRef}/team/${division.ref}/statements/summary`,
				'GET'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error for non-existing or invalid division', async () => {
			let invalidDivisionRef = makeUniqueString();
			options.uri = signPath(
				`/contest/${contestTeamRef}/team/${invalidDivisionRef}/statements/summary`,
				'GET'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/contest/${contestTeamRef}/summary/statements/admin`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible to a [non-participant]', async () => {
			await login(user.email, user.rawPass);
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
