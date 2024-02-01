const chai = require('chai');
const expect = chai.expect;
const request = require('request-promise');
require('chai-date-string')(chai);

const {
	baseUrl,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	makeIsoDateString,
	checkCreateStatusCode,
	login,
	signPath,
	generateJoinContestRequest,
	approveJoinRequest,
	createDivisionMemberWithRole,
	createContest,
	createContestDivision,
	createContestParticipant,
	assignParticipantDivisionRole,
} = require('../common.js');

describe('Event', () => {
	let options,
		owner,
		ownerData,
		otherEventOwner,
		otherEventOwnerData,
		baseEventData,
		events,
		otherEvent,
		startDate,
		endDate,
		contestTeam,
		division,
		admin,
		participant,
		divisionLeader,
		divisionGuide,
		divisionMember,
		checkFeaturedEventsData,
		checkFeaturedContestsData,
		hasRelationToContestByRole;

	before(async () => {
		options = {...basePostOptions};

		events = [];

		startDate = makeIsoDateString(0, 0, -1);
		endDate = makeIsoDateString(0, 0, 5);

		/****** Create users *******/
		let createUserPath = baseUrl + '/user';

		// Create users
		owner = generateUserData();
		ownerData = await createItem(createUserPath, owner);

		otherEventOwner = generateUserData();
		otherEventOwnerData = await createItem(createUserPath, otherEventOwner);

		// Simulate login for owner
		await login(owner.email, owner.rawPass);

		options.transform = null;
		options.uri = signPath('/event', 'POST');
		baseEventData = {
			name: makeUniqueString(),
			description: 'Event description',
			visibility: 'private',
			start_date: '2019-01-14 14:23:28',
			end_date: '2019-01-20 19:23:28',
		};
		options.body = baseEventData;

		// Create Events for owner
		for (let i = 0; i <= 4; i++) {
			let response = await createItem(signPath('/event', 'POST'), baseEventData);
			events.push(response.data.ref);
		}

		// Simulate login for otherEventOwner
		await login(otherEventOwner.email, otherEventOwner.rawPass);
		otherEvent = await createItem(signPath('/event', 'POST'), baseEventData);

		// Login back to user 1 for postivite tests
		await login(owner.email, owner.rawPass);

		// Create Contest Team
		contestTeam = await createContest();

		// Create Division
		division = await createContestDivision(contestTeam.data.ref);

		// Create an admin to the contest
		admin = await createContestParticipant(owner, contestTeam.data.ref, 'admin');

		// Create a member to the contest
		participant = await createContestParticipant(owner, contestTeam.data.ref, 'participant');

		// Create Participant and Assign Leader Role
		divisionLeader = await createDivisionMemberWithRole(admin, contestTeam, division, 'leader');

		// Create Participant and Assign Member Role
		divisionGuide = await createDivisionMemberWithRole(admin, contestTeam, division, 'guide');

		// Create Participant and Assign Member Role
		divisionMember = await createDivisionMemberWithRole(admin, contestTeam, division, 'member');

		checkFeaturedEventsData = (events) => {
			for (let event of events) {
				expect(event).to.have.property('feature_start');
				expect(event).to.have.property('feature_end');
				expect(event).to.have.property('collection');
				expect(event.feature_start).to.be.a.dateString();
				expect(event.feature_end).to.be.a.dateString();
				expect(event.collection).to.be.an('object');
			}
		};

		checkFeaturedContestsData = (contests) => {
			if (contests) {
				for (let contest of contests) {
					expect(contest).to.have.property('ref');
					expect(contest).to.have.property('handle');
					expect(contest).to.have.property('name');
					expect(contest).to.have.property('description');
					expect(contest).to.have.property('type');
					expect(contest).to.have.property('user_relations');
					expect(contest.ref).to.be.a('string');
					expect(contest.handle).to.be.a('string');
					expect(contest.name).to.be.a('string');
					expect(contest.description).to.be.a('string');
					expect(contest.type).to.be.a('string');
					expect(contest.user_relations).to.be.an('array');
				}
			}
		};

		hasRelationToContestByRole = (contests, role) => {
			for (let contest of contests) {
				if (contest.user_relations.includes(role)) {
					return true;
				}
			}
			return false;
		};
	});

	describe('Get Featured Events', () => {
		beforeEach(async () => {
			await login(owner.email, owner.rawPass);
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath('/events/featured', 'GET');
			options.body = {};
		});

		// Positive Tests
		it('should be available site-wide', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper [GET] data for contest [owner]', async () => {
			let response = await request(options);
			let events = response.events;
			let contests = response.contests;
			checkFeaturedEventsData(events);
			checkFeaturedContestsData(contests);

			// Contest count must be more than one
			expect(contests.length > 0).to.equal(true);

			// Must have a owner rights
			let hasOwnerRights = hasRelationToContestByRole(contests, 'owner');
			expect(hasOwnerRights).to.equal(true);
		});

		it('should return proper [GET] data for contest [admin]', async () => {
			// login the admin and sign path
			await login(admin.email, admin.rawPass);
			options.uri = signPath('/events/featured', 'GET');

			let response = await request(options);
			let events = response.events;
			let contests = response.contests;
			checkFeaturedEventsData(events);
			checkFeaturedContestsData(contests);

			// Contest count must be more than one
			expect(contests.length > 0).to.equal(true);

			// Must have a admin rights
			let hasAdminRights = hasRelationToContestByRole(contests, 'admin');
			expect(hasAdminRights).to.equal(true);
		});

		it('should return proper [GET] data for contest [divisionLeader]', async () => {
			// login the divisionLeader and sign path
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath('/events/featured', 'GET');

			let response = await request(options);
			let events = response.events;
			let contests = response.contests;
			checkFeaturedEventsData(events);
			checkFeaturedContestsData(contests);

			// Contest count must be more than one
			expect(contests.length > 0).to.equal(true);

			// Must have a leader rights
			let hasDivisionLeaderRights = hasRelationToContestByRole(contests, 'team_leader');
			expect(hasDivisionLeaderRights).to.equal(true);
		});

		it('should not return featured contest for contest [participant]', async () => {
			// login the participant and sign path
			await login(participant.email, participant.rawPass);
			options.uri = signPath('/events/featured', 'GET');

			let response = await request(options);
			let events = response.events;
			let contests = response.contests;
			checkFeaturedEventsData(events);
			checkFeaturedContestsData(contests);

			// Contests should be empty for participant
			expect(contests.length > 0).to.equal(false);
		});

		it('should not return featured contest for contest [divisionGuide]', async () => {
			// login the divisionGuide and sign path
			await login(divisionGuide.email, divisionGuide.rawPass);
			options.uri = signPath('/events/featured', 'GET');

			let response = await request(options);
			let events = response.events;
			let contests = response.contests;
			checkFeaturedEventsData(events);
			checkFeaturedContestsData(contests);

			// Contests should be empty for divisionGuide
			expect(contests.length > 0).to.equal(false);
		});

		it('should not return featured contest for contest [divisionMember]', async () => {
			// login the divisionMember and sign path
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath('/events/featured', 'GET');

			let response = await request(options);
			let events = response.events;
			let contests = response.contests;
			checkFeaturedEventsData(events);
			checkFeaturedContestsData(contests);

			// Contests should be empty for divisionMember
			expect(contests.length > 0).to.equal(false);
		});

		it('should not return featured contest for former [divisionLeader] turned to [divisionMember]', async () => {
			// Create a division leader
			let divisionLeaderTurnedToMember = await createDivisionMemberWithRole(
				admin,
				contestTeam,
				division,
				'leader'
			);
			await assignParticipantDivisionRole(
				admin,
				contestTeam,
				divisionLeaderTurnedToMember,
				'member'
			);

			// login the divisionLeaderTurnedToMember and sign path
			await login(divisionLeaderTurnedToMember.email, divisionLeaderTurnedToMember.rawPass);
			options.uri = signPath('/events/featured', 'GET');

			let response = await request(options);
			let events = response.events;
			let contests = response.contests;
			checkFeaturedEventsData(events);
			checkFeaturedContestsData(contests);

			// Contests should be empty for divisionLeaderTurnedToMember
			expect(contests.length > 0).to.equal(false);
		});

		it('should not return featured contest for former [divisionLeader] turned to [divisionGuide]', async () => {
			// Create a division leader
			let divisionLeaderTurnedToGuide = await createDivisionMemberWithRole(
				admin,
				contestTeam,
				division,
				'leader'
			);
			await assignParticipantDivisionRole(admin, contestTeam, divisionLeaderTurnedToGuide, 'guide');

			// login the divisionLeaderTurnedToGuide and sign path
			await login(divisionLeaderTurnedToGuide.email, divisionLeaderTurnedToGuide.rawPass);
			options.uri = signPath('/events/featured', 'GET');

			let response = await request(options);
			let events = response.events;
			let contests = response.contests;
			checkFeaturedEventsData(events);
			checkFeaturedContestsData(contests);

			// Contests should be empty for divisionLeaderTurnedToGuide
			expect(contests.length > 0).to.equal(false);
		});
	});
});
