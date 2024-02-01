const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const expect = require('chai').expect;
const request = require('request-promise');
const _pluck = require('lodash').map;

const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	createContestParticipant,
	createDivisionMemberWithRole,
	assignParticipantToDivision,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	createContest,
	createContestDivision,
	createContestCollection,
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
		contestSubjectImpression,
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
		contestDivisionStatementA,
		contestDivisionStatementB,
		checkContestDivisionStats,
		createImpressions,
		checkDivisionMemberImpressions,
		contest,
		contestRef,
		divisionA,
		divisionB,
		divisionC;

	before(async function () {
		this.timeout(320000);

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

		// Make a statement about an impression
		contestDivisionStatementA = await addDivisionStatement(
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

		// Update that statement (same impression)
		contestDivisionStatementB = await addDivisionStatement(
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

		checkContestDivisionStats = (divisionStats) => {
			expect(divisionStats).to.have.property('collection');
			expect(divisionStats).to.have.property('team');
			expect(divisionStats).to.have.property('subjects');
			expect(divisionStats.collection).to.be.a('object');
			expect(divisionStats.team).to.be.an('object');
			expect(divisionStats.subjects).to.be.a('array');

			// Check collection
			let collection = divisionStats.collection;
			expect(collection).to.have.property('name');
			expect(collection).to.have.property('ref');
			expect(collection).to.have.property('metadata');
			expect(collection.name).to.be.an('string');
			expect(collection.ref).to.be.an('string');
			expect(collection.metadata).to.be.an('object');

			// Check team
			let team = divisionStats.team;
			expect(team).to.have.property('name');
			expect(team).to.have.property('ref');
			expect(team.name).to.be.an('string');
			expect(team.ref).to.be.an('string');

			// Check subjects
			let subjects = divisionStats.subjects;
			subjects.forEach((subject) => {
				expect(subject).to.have.property('data');
				expect(subject).to.have.property('team_statement');
				expect(subject).to.have.property('impressions');
				expect(subject.data).to.be.an('object');
				if (subject.team_statement) {
					expect(subject.team_statement).to.be.an('object');
				}

				let subjectImpressions = subject.impressions;
				expect(subjectImpressions).to.be.an('array');

				if (subjectImpressions) {
					subjectImpressions.forEach((impression) => {
						expect(impression).to.have.property('creator');
						expect(impression).to.have.property('data');

						// check creator data
						let creator = impression.creator;
						expect(creator).to.have.property('ref');
						expect(creator).to.have.property('email');
						expect(creator).to.have.property('name');

						// creator ref and email must not be null
						expect(creator.ref).to.not.equal(null);
						expect(creator.email).to.not.equal(null);
					});
				}
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

	describe('Team Stats', () => {
		beforeEach(async () => {
			// Let contest admin be the default user
			await login(contestAdmin.email, contestAdmin.rawPass);

			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
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

			contest = await createContest();
			contestRef = contest.data.ref;

			// Add 3 divisions to the team for testing
			divisionA = await createContestDivision(contestRef);
			divisionB = await createContestDivision(contestRef);
			divisionC = await createContestDivision(contestRef);
		});

		/* Positive tests */
		it('should be successful and return proper data user[contest admin]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			let divisionStats = await request(options);
			checkContestDivisionStats(divisionStats.data);
		});

		it('should be successful and return proper data user[contest division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			let divisionStats = await request(options);
			checkContestDivisionStats(divisionStats.data);
		});

		it('should be accessible using a [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have the correct collection impressions', async () => {
			// The imported contestImpressions must match the subjects
			let divisionStats = await request(options);
			let subjects = divisionStats.data.subjects;
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

		it('should have the correct contest team statements', async () => {
			// Get the contest by contest ref for comparisons
			options.uri = signPath(`/contest/${contestTeam.data.ref}`);
			let contest = await request(options);
			let divisionTeam = contest.data.teams.filter((team) => {
				return division.ref == team.ref;
			});
			let divisionTeamStatements = divisionTeam[0].statements;

			// Get the contest division stats
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			let divisionStats = await request(options);
			let subjects = divisionStats.data.subjects;

			// The division team statements must match the subjects team statements
			subjects.forEach((subject) => {
				let data = subject.data;
				let subjectTeamStatement = subject.team_statement;
				if (subject.impressions.length > 0) {
					let subjectImpressionsRefs = _pluck(subject.impressions, 'data.ref');
					divisionTeamStatements.forEach((statement) => {
						if (subjectImpressionsRefs.includes(statement.marked_impression)) {
							expect(statement.statement).to.equal(subjectTeamStatement.statement);
						}
					});
				}
			});
		});

		it('should have the correct contest team subjects impressions creator', async () => {
			// Call the get team stats API before adding impressions
			let divisionStats = await request(options);
			let subjects = divisionStats.data.subjects;
			let userRefs = [];

			// Add an impression for each subject for testing by making it as the mold
			for (let i = 0; i < subjects.length; i++) {
				// create a member and login so he becomes the owner
				let testUser = await createDivisionMemberWithRole(
					contestAdmin,
					contestTeam,
					division,
					'member'
				);

				await login(testUser.email, testUser.rawPass);
				userRefs.push(testUser.ref);

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
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			divisionStats = await request(options);
			subjects = divisionStats.data.subjects;

			subjects.forEach((subject) => {
				let memberImpressionIncluded = false;
				if (subject.impressions && subject.impressions.length > 0) {
					subject.impressions.forEach((impression) => {
						if (userRefs.includes(impression.creator.ref)) {
							memberImpressionIncluded = true;
						}
					});
				}

				expect(memberImpressionIncluded).to.equal(true);
			});
		});

		it('should have the correct contest team subjects impressions', async () => {
			// Call the get team stats API before adding impressions
			let divisionStats = await request(options);
			let subjects = divisionStats.data.subjects;
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
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			divisionStats = await request(options);
			subjects = divisionStats.data.subjects;

			subjects.forEach((subject) => {
				if (subject.impressions && subject.impressions > 0) {
					let impression = subject.impressions[1];
					expect(createdImpressions.includes(impression.data.ref)).to.equal(true);
				}
			});
		});

		// The leader of a team should not see the impressions made by the members of other teams if their teams are assigned the same collection.
		it('should return the correct impressions for each team/division for the same collection and each team should not see impressions made by other teams or its members', async () => {
			// Add a contest collection that will be shared and assigned to all teams above
			let collection = await createContestCollection(contestRef);
			let collectionRef = collection.ref;
			await assignContestCollectionToDivision(contestRef, collectionRef, divisionA.ref);
			await assignContestCollectionToDivision(contestRef, collectionRef, divisionB.ref);
			await assignContestCollectionToDivision(contestRef, collectionRef, divisionC.ref);

			// Create team leaders (for each division) that would be used to access the stats
			let divisionALeader = await createDivisionMemberWithRole(
				contestAdmin,
				contest,
				divisionA,
				'leader'
			);
			let divisionBLeader = await createDivisionMemberWithRole(
				contestAdmin,
				contest,
				divisionB,
				'leader'
			);
			let divisionCLeader = await createDivisionMemberWithRole(
				contestAdmin,
				contest,
				divisionC,
				'leader'
			);

			// Create team members (for each division) that would be used to create impressions
			let divisionAMember = await createDivisionMemberWithRole(
				contestAdmin,
				contest,
				divisionA,
				'member'
			);
			let divisionBMember = await createDivisionMemberWithRole(
				contestAdmin,
				contest,
				divisionB,
				'member'
			);
			let divisionCMember = await createDivisionMemberWithRole(
				contestAdmin,
				contest,
				divisionC,
				'member'
			);

			// Import impressions for the collection
			let collectionSubjects = await importImpressionsForContestCollection(
				contestRef,
				collectionRef
			);

			// Check the stats for the contest admin before adding impressions for the user
			options.uri = signPath(
				`/contest/${contestRef}/collection/${collectionRef}/team/${divisionA.ref}/stats`
			);
			let divisionStats = await request(options);
			let subjects = divisionStats.data.subjects;
			let divisionSubjects = subjects.map((subject) => {
				return subject.data.ref;
			});

			// The subjects in the stats must the same for the recently imported impressions
			collectionSubjects.forEach((collectionSubject, key) => {
				expect(divisionSubjects.includes(collectionSubject.ref)).to.equal(true);
			});

			// Create an impression for each member and distribute the subjects as the mold for their impressions.
			await login(divisionAMember.email, divisionAMember.rawPass);
			let divisionAMemberImpression = await createImpressions(divisionSubjects[0]);

			await login(divisionBMember.email, divisionBMember.rawPass);
			let divisionBMemberImpression = await createImpressions(divisionSubjects[1]);

			await login(divisionCMember.email, divisionCMember.rawPass);
			let divisionCMemberImpression = await createImpressions(divisionSubjects[2]);

			// Check the stats for divisionA and make sure that only the impressions created by its member are returned
			await login(divisionALeader.email, divisionALeader.rawPass);
			options.uri = signPath(
				`/contest/${contestRef}/collection/${collectionRef}/team/${divisionA.ref}/stats`
			);
			let response = await request(options);
			let divisionAStats = response.data.subjects;
			checkDivisionMemberImpressions(divisionAStats, divisionAMemberImpression.data);

			// Check the stats for divisionB and make sure that only the impressions created by its member are returned
			await login(divisionBLeader.email, divisionBLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestRef}/collection/${collectionRef}/team/${divisionB.ref}/stats`
			);
			response = await request(options);
			let divisionBStats = response.data.subjects;
			checkDivisionMemberImpressions(divisionBStats, divisionBMemberImpression.data);

			// Check the stats for divisionC and make sure that only the impressions created by its member are returned
			await login(divisionCLeader.email, divisionCLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestRef}/collection/${collectionRef}/team/${divisionC.ref}/stats`
			);
			response = await request(options);
			let divisionCStats = response.data.subjects;
			checkDivisionMemberImpressions(divisionCStats, divisionCMemberImpression.data);
		});

		it('should return the correct impressions for a team/division even if a member is moved to another team', async () => {
			// Add a contest collections that will be added to divisionA and divisionB
			let collectionA = await createContestCollection(contestRef);
			let collectionARef = collectionA.ref;

			let collectionB = await createContestCollection(contestRef);
			let collectionBRef = collectionB.ref;

			// Add collectionA to divisionA
			await assignContestCollectionToDivision(contestRef, collectionARef, divisionA.ref);

			// Add collectionB to divisionB
			await assignContestCollectionToDivision(contestRef, collectionBRef, divisionB.ref);

			// Create team leaders (for each division) that would be used to access the stats
			let divisionALeader = await createDivisionMemberWithRole(
				contestAdmin,
				contest,
				divisionA,
				'leader'
			);
			let divisionBLeader = await createDivisionMemberWithRole(
				contestAdmin,
				contest,
				divisionB,
				'leader'
			);

			// Create a member that will initially belong to divisionA and then be moved to divisionB
			let movingMember = await createDivisionMemberWithRole(
				contestAdmin,
				contest,
				divisionA,
				'member'
			);

			// Import subjects/impressions for collectionA
			let collectionASubjects = await importImpressionsForContestCollection(
				contestRef,
				collectionARef
			);

			// Check the stats for divisionA with collectionA before creating impressions for the "movingMember"
			options.uri = signPath(
				`/contest/${contestRef}/collection/${collectionARef}/team/${divisionA.ref}/stats`
			);
			let divisionStats = await request(options);
			let subjects = divisionStats.data.subjects;
			let divisionSubjects = subjects.map((subject) => {
				return subject.data.ref;
			});

			// The subjects in the stats must the same for the recently imported impressions
			collectionASubjects.forEach((collectionSubject, key) => {
				expect(divisionSubjects.includes(collectionSubject.ref)).to.equal(true);
			});

			// Create an impression using the moving member that will belong to divisionA
			await login(movingMember.email, movingMember.rawPass);
			let movingMemberImpressionInDivisionA = await createImpressions(divisionSubjects[0]);

			// Check the stats for divisionA and make sure that the impressions created by the "movingMember" is included
			await login(divisionALeader.email, divisionALeader.rawPass);
			options.uri = signPath(
				`/contest/${contestRef}/collection/${collectionARef}/team/${divisionA.ref}/stats`
			);
			let response = await request(options);
			let divisionAStats = response.data.subjects;
			checkDivisionMemberImpressions(divisionAStats, movingMemberImpressionInDivisionA.data);

			// Assign movingMember to divisionB
			await assignParticipantToDivision(contestAdmin, contest, movingMember, divisionB);

			// Check the stats for divisionA AGAIN and make sure that the impressions created by the "movingMember" whilst he/she is a member is still included
			await login(divisionALeader.email, divisionALeader.rawPass);
			options.uri = signPath(
				`/contest/${contestRef}/collection/${collectionARef}/team/${divisionA.ref}/stats`
			);
			response = await request(options);
			divisionAStats = response.data.subjects;
			checkDivisionMemberImpressions(divisionAStats, movingMemberImpressionInDivisionA.data);

			// Now make sure that the impression created by the "movingMember" won't be included in the divisionB stats
			await login(divisionBLeader.email, divisionBLeader.rawPass);
			options.uri = signPath(
				`/contest/${contestRef}/collection/${collectionBRef}/team/${divisionB.ref}/stats`
			);
			response = await request(options);
			let divisionBStats = response.data.subjects;
			checkDivisionMemberImpressions(divisionBStats, movingMemberImpressionInDivisionA.data);
		});

		/* Negative tests */

		it('should not be accessible using a [traditional team]', async () => {
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using an [invalid contest ref]', async () => {
			let invalidRef = makeUniqueString();
			options.uri = signPath(
				`/contest/${invalidRef}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [non participant]', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [non assigned participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [contest admin] from another contest', async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division leader] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be accessible using a [division member] from another contest', async () => {
			await login(anotherContestDivisionMember.email, anotherContestDivisionMember.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should NOT have the correct contest team subjects impressions creator if the creator is not a member of the division at the time of impression creation', async () => {
			// Call the get team stats API before adding impressions
			let divisionStats = await request(options);
			let subjects = divisionStats.data.subjects;
			let userRefs = [];

			// Add an impression for each subject for testing by making it as the mold
			for (let i = 0; i < subjects.length; i++) {
				// create a user that is not a member of the division and user the subject as mold
				let testUser = generateUserData();
				let testUserData = await createItem(baseUrl + '/user', testUser);
				await login(testUser.email, testUser.rawPass);
				userRefs.push(testUserData.data.ref);

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
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/team/${division.ref}/stats`
			);
			divisionStats = await request(options);
			subjects = divisionStats.data.subjects;

			subjects.forEach((subject) => {
				let memberImpressionIncluded = false;
				if (subject.impressions && subject.impressions.length > 0) {
					subject.impressions.forEach((impression) => {
						if (userRefs.includes(impression.creator.ref)) {
							memberImpressionIncluded = true;
						}
					});
				}

				// this should remain false because non of the impressions that were created by the users (non-members) above should be included in the stats
				expect(memberImpressionIncluded).to.equal(false);
			});
		});
	});
});
