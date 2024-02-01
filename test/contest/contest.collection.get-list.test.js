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
	login,
	signPath,
	sleep,
	getBackendTime,
	createContest,
	createContestDivision,
	createContestCollection,
	createContestParticipant,
	assignContestCollectionToDivision,
	createTraditionalCollection,
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
		contestCollectionA,
		contestCollectionB,
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

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		contestAdmin = generateUserData();
		contestAdminData = await createItem(createUserPath, contestAdmin);

		nonParticipant = generateUserData();
		nonParticipantData = await createItem(createUserPath, nonParticipant);

		await login(contestAdmin.email, contestAdmin.rawPass);

		// Format js date to backend acceptable date
		let consoleTime = await getBackendTime();

		// Create Contest Team
		contestTeam = await createContest();

		// Create Division
		division = await createContestDivision(contestTeam.data.ref);

		// Create Another Division
		anotherDivision = await createContestDivision(contestTeam.data.ref);

		// Create Contest Collections
		options.body = {
			name: 'Contest Collection',
			description: 'Collection for a Contest Team',
			start_date: '2019-01-14 14:23:28',
			end_date: consoleTime,
		};

		contestCollectionA = await createContestCollection(contestTeam.data.ref, options.body);
		contestCollectionB = await createContestCollection(contestTeam.data.ref, options.body);

		// Assign Contest Collections to Divisions
		await assignContestCollectionToDivision(
			contestTeam.data.ref,
			contestCollectionA.ref,
			division.ref
		);
		await assignContestCollectionToDivision(
			contestTeam.data.ref,
			contestCollectionB.ref,
			anotherDivision.ref
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

		// Create Another Contest Team
		anotherContestTeam = await createContest();

		// Create a Division that belongs to another Contest
		anotherContestDivision = await createContestDivision(anotherContestTeam.data.ref);

		// Create a Collection that belongs to Another Contest
		options.body = {
			name: 'Contest Collection',
			description: 'Collection for a Contest Team',
			start_date: '2019-01-14 14:23:28',
			end_date: consoleTime,
		};
		anotherContestCollection = await createContestCollection(
			anotherContestTeam.data.ref,
			options.body
		);

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

		// Create Traditional Collection
		options.body = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'open',
			start_date: '2019-01-14 14:23:28',
			end_date: consoleTime,
			sub_type: 'blind',
		};
		traditionalCollection = await createTraditionalCollection(options.body);
	});

	describe('Get Collections using Contest Related Users (List)', async function () {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(`/events`);
		});

		/* Positive tests */

		it('should be successful and return proper data for [contest admin]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(`/events`);
			let collections = await request(options);

			let collectionA = collections.find((cc) => {
				return cc.ref === contestCollectionA.ref;
			});

			let collectionB = collections.find((cc) => {
				return cc.ref === contestCollectionB.ref;
			});

			let collectionC = collections.find((tc) => {
				return tc.ref === traditionalCollection.data.ref;
			});

			// contest/2328 : Expect NOT to see all contest collections
			expect(collectionA).to.equal(undefined);
			expect(collectionB).to.equal(undefined);

			// Expect to see vanilla /events behavior, which means any collection made by any user that has an open visibility
			expect(collectionC).to.not.equal(undefined);
			expect(collections.length).to.be.at.least(1);
		});

		it('should be successful and return proper data for [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`/events`);
			let collections = await request(options);

			let collectionA = collections.find((cc) => {
				return cc.ref === contestCollectionA.ref;
			});

			let collectionB = collections.find((cc) => {
				return cc.ref === contestCollectionB.ref;
			});

			let collectionC = collections.find((tc) => {
				return tc.ref === traditionalCollection.data.ref;
			});

			// Expect to see all contest collections assigned to this user's division
			expect(collectionA).to.not.equal(undefined);

			// Expect not to see collections that are not assigned to this user's division
			expect(collectionB).to.equal(undefined);

			// Expect to see vanilla /events behavior, which means any collection made by any user that has an open visibility
			expect(collectionC).to.not.equal(undefined);
			expect(collections.length).to.be.at.least(2);
		});

		it('should be successful and return proper data for [division guide]', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(`/events`);
			let collections = await request(options);

			let collectionA = collections.find((cc) => {
				return cc.ref === contestCollectionA.ref;
			});

			let collectionB = collections.find((cc) => {
				return cc.ref === contestCollectionB.ref;
			});

			let collectionC = collections.find((tc) => {
				return tc.ref === traditionalCollection.data.ref;
			});

			// Expect to see all contest collections assigned to this user's division
			expect(collectionA).to.not.equal(undefined);

			// Expect not to see collections that are not assigned to this user's division
			expect(collectionB).to.equal(undefined);

			// Expect to see vanilla /events behavior, which means any collection made by any user that has an open visibility
			expect(collectionC).to.not.equal(undefined);
			expect(collections.length).to.be.at.least(2);
		});

		it('should be successful and return proper data for [division member]', async () => {
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath(`/events`);
			let collections = await request(options);

			let collectionA = collections.find((cc) => {
				return cc.ref === contestCollectionA.ref;
			});

			let collectionB = collections.find((cc) => {
				return cc.ref === contestCollectionB.ref;
			});

			let collectionC = collections.find((tc) => {
				return tc.ref === traditionalCollection.data.ref;
			});

			// Expect to see all contest collections assigned to this user's division
			expect(collectionA).to.not.equal(undefined);

			// Expect not to see collections that are not assigned to this user's division
			expect(collectionB).to.equal(undefined);

			// Expect to see vanilla /events behavior, which means any collection made by any user that has an open visibility
			expect(collectionC).to.not.equal(undefined);
			expect(collections.length).to.be.at.least(2);
		});

		it('should be successful and return proper data for [non participant]', async () => {
			await login(nonParticipant.email, nonParticipant.rawPass);
			options.uri = signPath(`/events`);
			let collections = await request(options);

			let collectionA = collections.find((cc) => {
				return cc.ref === contestCollectionA.ref;
			});

			let collectionB = collections.find((cc) => {
				return cc.ref === contestCollectionB.ref;
			});

			let collectionC = collections.find((tc) => {
				return tc.ref === traditionalCollection.data.ref;
			});

			// Expect not to see any contest collections since we are not assigned to any division
			expect(collectionA).to.equal(undefined);
			expect(collectionB).to.equal(undefined);

			// Expect to see vanilla /events behavior, which means any collection made by any user that has an open visibility
			expect(collectionC).to.not.equal(undefined);
			expect(collections.length).to.be.at.least(1);
		});

		it('should be successful and return proper data for [unassigned participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/events`);
			let collections = await request(options);

			let collectionA = collections.find((cc) => {
				return cc.ref === contestCollectionA.ref;
			});

			let collectionB = collections.find((cc) => {
				return cc.ref === contestCollectionB.ref;
			});

			let collectionC = collections.find((tc) => {
				return tc.ref === traditionalCollection.data.ref;
			});

			// Expect not to see any contest collections since we are not assigned to any division
			expect(collectionA).to.equal(undefined);
			expect(collectionB).to.equal(undefined);

			// Expect to see vanilla /events behavior, which means any collection made by any user that has an open visibility
			expect(collectionC).to.not.equal(undefined);
			expect(collections.length).to.be.at.least(1);
		});

		it('should not list past traditional collections', async () => {
			// Wait for created public collection to expire
			await sleep(90000);

			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath('/events', 'GET');
			let events = await request(options);
			let pastEventFound = false;
			for (let i = 0; i < events.length; i++) {
				if (events[i].name == traditionalCollection.data.ref) {
					pastEventFound = true;
				}
			}

			expect(pastEventFound).to.equal(false);
		});

		it('should not list past contest collections', async () => {
			// Wait for created contest collection to expire
			await sleep(90000);

			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath('/events', 'GET');
			let events = await request(options);
			let pastEventFound = false;
			for (let i = 0; i < events.length; i++) {
				if (events[i].name == contestCollectionA.ref) {
					pastEventFound = true;
				}

				if (events[i].name == contestCollectionB.ref) {
					pastEventFound = true;
				}
			}

			expect(pastEventFound).to.equal(false);
		});
	});
});
