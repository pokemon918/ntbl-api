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
	addContestStatement,
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
		anotehrContestImpression,
		anotherContestTeam,
		anotherContestDivision,
		anotherContestCollection,
		anotherContestImpressions,
		anotherContestImpression,
		traditionalTeam,
		traditionalCollection,
		traditionalImpression,
		expectedStatements,
		contestDivisionStatementA,
		contestDivisionStatementB,
		checkContestStats,
		createImpressions,
		checkDivisionMemberImpressions;

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

		// Create Impression subject
		contestSubject = await createTraditionalImpression({
			name: makeUniqueString(),
			mold: contestImpression.ref,
		});

		// Make a statement about an impression
		await login(contestAdmin.email, contestAdmin.rawPass);

		// Initialize Statement Count
		expectedStatements = 0;

		// Make Statement
		contestDivisionStatementA = await addContestStatement(
			contestTeam.data.ref,
			contestCollection.ref,
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

		// Increment Statement Count
		expectedStatements++;

		// Update that statement (same impression)
		contestDivisionStatementB = await addContestStatement(
			contestTeam.data.ref,
			contestCollection.ref,
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
		await addContestStatement(contestTeam.data.ref, contestCollection.ref, contestImpression.ref, {
			marked_impression: contestSubject.data.ref,
			flag: true,
			request: true,
			statement: makeUniqueString(),
			extra_a: makeUniqueString(),
			extra_b: makeUniqueString(),
			extra_c: makeUniqueString(),
			extra_d: makeUniqueString(),
			extra_e: makeUniqueString(),
		});

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

		checkContestStats = (contestStats) => {
			expect(contestStats).to.have.property('subjects');
			expect(contestStats.subjects).to.be.a('array');

			// Check subjects
			let subjects = contestStats.subjects;
			subjects.forEach((subject) => {
				expect(subject).to.have.property('data');
				expect(subject).to.have.property('team_statement');
				expect(subject).to.have.property('impressions');
				expect(subject.data).to.be.an('object');
				if (subject.team_statement) {
					expect(subject.team_statement).to.be.an('object');
				}
				expect(subject.impressions).to.be.an('array');
			});
		};

		createImpressions = async (moldRef) => {
			let testImpressionData = {
				name: 'test_name',
				mold: moldRef,
			};
			let path = signPath('/tasting', 'POST');
			let createdImpression = await createItem(path, testImpressionData);
			return createdImpression;
		};

		checkDivisionMemberImpressions = (subjects, memberImpression) => {
			subjects.forEach((subject) => {
				// If the impressions is not empty, the one and only item in it should be equal to given member impressions because the stats API has been called for the member's division
				if (subject.impressions && subject.impressions.length > 0) {
					expect(memberImpression.mold).to.equal(subject.data.ref);
					expect(memberImpression.ref).to.equal(subject.impressions[0].data.ref);
				} else {
					expect(subject.impressions.length).to.equal(0);
				}
			});
		};
	});

	describe('Contest Stats', () => {
		beforeEach(async () => {
			// Let contest admin be the default user
			await login(contestAdmin.email, contestAdmin.rawPass);

			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);

			options.body = {
				marked_impression: contestImpression.ref,
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
		it('should be successful and return proper data user[contest admin]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			let contestStats = await request(options);
			checkContestStats(contestStats.data);
		});

		it('should have the correct collection impressions', async () => {
			// The imported contestImpressions must match the subjects
			let contestStats = await request(options);
			let subjects = contestStats.data.subjects;
			let subjectsRefs = [];
			let subjectsCollections = [];

			subjects.forEach((subject) => {
				let data = subject.data;
				subjectsRefs.push(data.ref);
				subjectsCollections.push(data.collection);
			});

			contestImpressions.forEach((contestImpression) => {
				expect(contestImpression.collection).to.equal(contestCollection.ref);
				expect(subjectsRefs.includes(contestImpression.ref)).to.equal(true);
				expect(subjectsCollections.includes(contestImpression.collection)).to.equal(true);
			});
		});

		it('should have the correct contest team subjects impressions [owner]', async () => {
			// Call the get team stats API before adding impressions
			let contestStats = await request(options);
			let subjects = contestStats.data.subjects;
			let userRefs = [];

			// Add an impression for each subject for testing by making it as the mold
			for (let i = 0; i < subjects.length; i++) {
				userRefs.push(contestAdminData.data.ref);
				let testImpressionData = {
					name: 'test_name',
					mold: subjects[i].data.ref,
				};
				let path = signPath('/tasting', 'POST');
				let createdImpression = await createItem(path, testImpressionData);
			}

			// Call the get team stats API again and compare the creator to the ones who created the impressions
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			contestStats = await request(options);
			subjects = contestStats.data.subjects;

			subjects.forEach((subject) => {
				if (subject.impressions && subject.impressions > 0) {
					let impression = subject.impressions[0];
					expect(userRefs.includes(impression.creator)).to.equal(true);
				}
			});
		});

		it('should have the correct contest team subjects impressions', async () => {
			// Call the get team stats API before adding impressions
			let contestStats = await request(options);
			let subjects = contestStats.data.subjects;
			let createdImpressions = [];

			// Add an impression for each subject for testing by making it as the mold
			for (let i = 0; i < subjects.length; i++) {
				let testImpressionData = {
					name: 'test_name',
					mold: subjects[i].data.ref,
				};
				let path = signPath('/tasting', 'POST');
				let createdImpression = await createItem(path, testImpressionData);
				createdImpressions.push(createdImpression.data.ref);
			}

			// Call the get team stats API again. This time, the subjects must each have an impression that would match the previously added ones
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			contestStats = await request(options);
			subjects = contestStats.data.subjects;

			subjects.forEach((subject) => {
				if (subject.impressions && subject.impressions > 0) {
					let impression = subject.impressions[1];
					expect(createdImpressions.includes(impression.data.ref)).to.equal(true);
				}
			});
		});

		it('should only return the contest subjects or molds if onlymolds flag is sent and set to 1', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			options.uri = `${options.uri}&onlymolds=1`;
			let contestStats = await request(options);

			// The subjects must not have a team_statement and impressions
			contestStats.data.forEach((subject) => {
				expect(subject).to.not.have.property('team_statement');
				expect(subject).to.not.have.property('impressions');
			});
		});

		it('should work normally if onlymolds flag is sent and but set to a value not equal to 1', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			options.uri = `${options.uri}&onlymolds=adfadsfasdfadsfasdfa`;
			let contestStats = await request(options);
			checkContestStats(contestStats.data);
		});

		/* Negative tests */

		it('should not be accessible using a [traditional team]', async () => {
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using an [invalid contest ref]', async () => {
			let invalidRef = makeUniqueString();
			options.uri = signPath(`/contest/${invalidRef}/collection/${contestCollection.ref}/stats`);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [non participant]', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [non assigned participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division member]', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [contest admin] from another contest', async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division leader] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division member] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
