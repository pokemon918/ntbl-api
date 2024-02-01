const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const expect = require('chai').expect;
const request = require('request-promise');

const {
	baseUrl,
	baseGetOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	checkContestTeamData,
	generateJoinContestRequest,
	createDivisionMemberWithRole,
	createContest,
	createContestDivision,
	createContestCollection,
	createContestParticipant,
	assignContestCollectionToDivision,
	importImpressionsForContestCollection,
	createTraditionalImpression,
} = require('../common.js');

describe('Contest Team', () => {
	let options,
		path,
		contestTeamData,
		contestTeam,
		creator,
		division,
		anotherDivision,
		contestCollection,
		anotherContestCollection,
		contestImpressions,
		contestImpression,
		anotherContestImpressions,
		anotherContestImpression;

	const checkBaseContestData = (contestTeam) => {
		expect(contestTeam).to.have.property('ref');
		expect(contestTeam).to.have.property('name');
		expect(contestTeam).to.have.property('description');
		expect(contestTeam).to.have.property('handle');
		expect(contestTeam).to.have.property('type');
		expect(contestTeam).to.have.property('user_relations');
		expect(contestTeam).to.have.property('alias');

		expect(contestTeam.ref).to.be.a('string');
		expect(contestTeam.name).to.be.a('string');
		expect(contestTeam.description).to.be.a('string');
		expect(contestTeam.handle).to.be.a('string');
		expect(contestTeam.type).to.be.a('string');
		expect(contestTeam.user_relations).to.be.an('array');
		expect(contestTeam.alias).to.be.an('object');
	};

	const checkLimitedContestData = (contestTeam) => {
		let userRelations = contestTeam.user_relations;

		let allowedRoles = ['owner', 'admin', 'team_owner', 'team_admin'];
		let admin = userRelations.some((userRelation) => allowedRoles.includes(userRelation));

		allowedRoles = ['team_leader', 'team_guide', 'team_member'];
		let assigned = userRelations.some((userRelation) => allowedRoles.includes(userRelation));

		allowedRoles = [
			'owner',
			'admin',
			'team_owner',
			'team_admin',
			'team_leader',
			'team_guide',
			'team_member',
		];
		let unassigned = !userRelations.some((userRelation) => allowedRoles.includes(userRelation));

		if (!admin) {
			expect(contestTeam).to.not.have.property('admins');
			expect(contestTeam).to.not.have.property('themes');
		}

		if (admin || assigned) {
			expect(contestTeam).to.have.property('participants');
			expect(contestTeam).to.have.property('teams');
			expect(contestTeam).to.have.property('collections');
		}

		if (unassigned) {
			expect(contestTeam).to.not.have.property('participants');
			expect(contestTeam).to.not.have.property('teams');
			expect(contestTeam).to.not.have.property('collections');
		}
	};

	before(async () => {
		options = {...baseGetOptions};
		// Create test users
		let createUserPath = baseUrl + '/user';
		creator = generateUserData();
		let response = await createItem(createUserPath, creator);

		// Simulate login
		await login(creator.email, creator.rawPass);
	});

	describe('Get By Ref', () => {
		beforeEach(async () => {
			// Login creator by default
			await login(creator.email, creator.rawPass);

			// Create a contest team
			contestTeam = await createContest();

			// Create Division
			division = await createContestDivision(contestTeam.data.ref);

			// Create Another Division
			anotherDivision = await createContestDivision(contestTeam.data.ref);

			// Create Contest Collection
			contestCollection = await createContestCollection(contestTeam.data.ref);

			// Create Another Contest Collection
			anotherContestCollection = await createContestCollection(contestTeam.data.ref);

			// Assign Contest Collection to Division
			await assignContestCollectionToDivision(
				contestTeam.data.ref,
				contestCollection.ref,
				division.ref
			);

			// Assign Another Contest Collection to Another Division
			await assignContestCollectionToDivision(
				contestTeam.data.ref,
				anotherContestCollection.ref,
				anotherDivision.ref
			);

			// Import Impressions to Collection
			contestImpressions = await importImpressionsForContestCollection(
				contestTeam.data.ref,
				contestCollection.ref
			);
			contestImpression = contestImpressions[0];

			// Import Impressions to Another Contest Collection
			anotherContestImpressions = await importImpressionsForContestCollection(
				contestTeam.data.ref,
				contestCollection.ref
			);
			anotherContestImpression = anotherContestImpressions[0];

			// Prepare options for fetching contests by ref
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
		});

		/* Positive tests */
		it('should return correct status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data for [owner/admin]', async () => {
			let updatedContest = await request(options);
			let contestTeamData = updatedContest.data;
			checkContestTeamData(contestTeam.data, 'admin');
			checkLimitedContestData(contestTeamData);
		});

		it('should return proper data for [participant]', async () => {
			// Create Participant
			let participant = await createContestParticipant(
				creator,
				contestTeam.data.ref,
				'participant'
			);
			await login(participant.email, participant.rawPass);
			let updatedContest = await request(options);
			let contestTeamData = updatedContest.data;
			checkBaseContestData(contestTeamData);
			checkLimitedContestData(contestTeamData);
		});

		it('should return proper data for [unrelated]', async () => {
			// Create Unrelated
			let createUserPath = baseUrl + '/user';
			let unrelated = generateUserData();
			await createItem(createUserPath, unrelated);

			await login(unrelated.email, unrelated.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let contestTeamData = updatedContest.data;
			checkBaseContestData(contestTeamData);
			checkLimitedContestData(contestTeamData);
		});

		it('should return proper data for [division leader]', async () => {
			// Create Participant and Assign Leader Role
			let divisionLeader = await createDivisionMemberWithRole(
				creator,
				contestTeam,
				division,
				'leader'
			);

			// Create Participant and Assign Member Role
			let divisionMember = await createDivisionMemberWithRole(
				creator,
				contestTeam,
				division,
				'member'
			);

			// Login the divisionLeader and call GET contest by ref API
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let contestTeamData = updatedContest.data;
			checkBaseContestData(contestTeamData);
			checkLimitedContestData(contestTeamData);
			expect(contestTeamData.teams.length).to.equal(1);
			expect(contestTeamData.teams[0].ref).to.equal(division.ref);
			expect(contestTeamData.participants.length).to.equal(2);
			expect(contestTeamData.collections.length).to.equal(1);
			expect(contestTeamData.collections[0].ref).to.equal(contestCollection.ref);
		});

		it('should return proper data for relation[division guide]', async () => {
			// Create Participant and Assign Leader Role
			let divisionGuide = await createDivisionMemberWithRole(
				creator,
				contestTeam,
				division,
				'guide'
			);

			// Login the divisionGuide and call GET contest by ref API
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let contestTeamData = updatedContest.data;
			checkBaseContestData(contestTeamData);
			checkLimitedContestData(contestTeamData);
			expect(contestTeamData.teams.length).to.equal(1);
			expect(contestTeamData.teams[0].ref).to.equal(division.ref);
			expect(contestTeamData.participants.length).to.equal(1);
			expect(contestTeamData.participants[0].ref).to.equal(divisionGuide.ref);
			expect(contestTeamData.collections.length).to.equal(1);
			expect(contestTeamData.collections[0].ref).to.equal(contestCollection.ref);
		});

		it('should return proper data for relation[division member]', async () => {
			// Create Participant and Assign member Role
			let divisionMember = await createDivisionMemberWithRole(
				creator,
				contestTeam,
				division,
				'member'
			);

			//login the divisionMember and call GET contest by ref API
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let contestTeamData = updatedContest.data;
			checkBaseContestData(contestTeamData);
			checkLimitedContestData(contestTeamData);
			expect(contestTeamData.teams.length).to.equal(1);
			expect(contestTeamData.teams[0].ref).to.equal(division.ref);
			expect(contestTeamData.participants.length).to.equal(1);
			expect(contestTeamData.participants[0].ref).to.equal(divisionMember.ref);
			expect(contestTeamData.collections.length).to.equal(1);
			expect(contestTeamData.collections[0].ref).to.equal(contestCollection.ref);
		});

		it('should return proper user relation[creator and owner]', async () => {
			// creator is logged in by default and is also the owner by default
			let updatedContest = await request(options);
			let userRelations = updatedContest.data.user_relations;
			expect(userRelations.includes('creator')).to.equal(true);
			expect(userRelations.includes('owner')).to.equal(true);
		});

		it('should return proper user relation[participant]', async () => {
			// Create participant
			let participant = await createContestParticipant(
				creator,
				contestTeam.data.ref,
				'participant'
			);

			// Login the participant and call GET contest by ref API
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let userRelations = updatedContest.data.user_relations;
			expect(userRelations.includes('participant')).to.equal(true);
		});

		it('should return proper user relation[admin]', async () => {
			// Create an admin
			let admin = await createContestParticipant(creator, contestTeam.data.ref, 'admin');

			// Login the admin and call GET contest by ref API
			await login(admin.email, admin.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let userRelations = updatedContest.data.user_relations;
			expect(userRelations.includes('admin')).to.equal(true);
		});

		it('should return proper user relation[division leader]', async () => {
			// Create Participant and Assign Leader Role
			let divisionLeader = await createDivisionMemberWithRole(
				creator,
				contestTeam,
				division,
				'leader'
			);

			//login the divisionLeader and call GET contest by ref API
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let userRelations = updatedContest.data.user_relations;
			expect(userRelations.includes('team_leader')).to.equal(true);
		});

		it('should return proper user relation[division guide]', async () => {
			// Create Participant and Assign Leader Role
			let divisionGuide = await createDivisionMemberWithRole(
				creator,
				contestTeam,
				division,
				'guide'
			);

			//login the divisionGuide and call GET contest by ref API
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let userRelations = updatedContest.data.user_relations;
			expect(userRelations.includes('team_guide')).to.equal(true);
		});

		it('should return proper user relation[division member]', async () => {
			// Create Participant and Assign member Role
			let divisionMember = await createDivisionMemberWithRole(
				creator,
				contestTeam,
				division,
				'member'
			);

			//login the divisionMember and call GET contest by ref API
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let userRelations = updatedContest.data.user_relations;
			expect(userRelations.includes('team_member')).to.equal(true);
		});

		it('should return proper user relation[requested_admin]', async () => {
			// Create User and Request to Join as Admin
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'admin');
			let admin = joinRequest.user;

			//login the admin requestor and call GET contest by ref API
			await login(admin.email, admin.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let userRelations = updatedContest.data.user_relations;
			expect(userRelations.includes('requested_admin')).to.equal(true);
		});

		it('should return proper user relation[requested_participant]', async () => {
			// Create User and Request to Join as Participant
			let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');
			let participant = joinRequest.user;

			//login the participant requestor and call GET contest by ref API
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let updatedContest = await request(options);
			let userRelations = updatedContest.data.user_relations;
			expect(userRelations.includes('requested_participant')).to.equal(true);
		});

		it('should include molds on impressions', async () => {
			// Create Contest Collection
			let contestCollection = await createContestCollection(contestTeam.data.ref);

			// Import Impressions to Collection
			let contestImpressions = await importImpressionsForContestCollection(
				contestTeam.data.ref,
				contestCollection.ref
			);

			// Create Traditional Impression
			let traditionalImpression = await createTraditionalImpression();

			// Update the impressions with mold
			for (let i = 0; i < contestImpressions.length; i++) {
				options.method = 'POST';
				options.body = {
					mold: traditionalImpression.data.ref,
				};
				options.uri = signPath(`/tasting/${contestImpressions[i].ref}`, 'POST');
				await request(options);
			}

			// Check for molds via collection (contest.collections now has less data)
			options.method = 'GET';
			options.uri = signPath(`/event/${contestCollection.ref}`, 'GET');
			let collection = await request(options);
			let impressionWithMolds = collection.tastings;

			for (let i = 0; i < impressionWithMolds.length; i++) {
				expect(impressionWithMolds[i].mold).to.equal(traditionalImpression.data.ref);
			}
		});

		// Negative Tests
		it('should return return error for non-existing refs', async () => {
			let nonExistingRef = makeUniqueString();
			options.uri = signPath(`/contest/${nonExistingRef}`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
