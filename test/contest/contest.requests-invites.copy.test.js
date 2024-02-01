const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const expect = require('chai').expect;
const request = require('request-promise');
const _pluck = require('lodash').map;
const _filter = require('lodash').filter;

const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	generateJoinContestRequest,
	requestToJoinContest,
	requestToJoinTraditionalTeam,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	getContest,
	createContest,
	createContestParticipant,
	createTraditionalTeam,
} = require('../common.js');

describe('Contest', () => {
	let options,
		contestAdmin,
		contestAdminData,
		adminA,
		participantA,
		anotherContestAdmin,
		anotherContestAdminData,
		userA,
		userAData,
		userB,
		userBData,
		userC,
		userCData,
		userD,
		userDData,
		userE,
		userEData,
		userF,
		userFData,
		sourceContest,
		targetContest,
		targetRole,
		traditionalTeam;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		contestAdmin = generateUserData();
		contestAdminData = await createItem(createUserPath, contestAdmin);

		anotherContestAdmin = generateUserData();
		anotherContestAdminData = await createItem(createUserPath, anotherContestAdmin);

		// Users A and B will be used to request to be participants
		userA = generateUserData();
		userAData = await createItem(createUserPath, userA);
		userB = generateUserData();
		userBData = await createItem(createUserPath, userB);

		// Users A and B will be used to request to be admins
		userC = generateUserData();
		userCData = await createItem(createUserPath, userC);
		userD = generateUserData();
		userDData = await createItem(createUserPath, userD);

		// Users A and B will be used to request to be members
		userE = generateUserData();
		userEData = await createItem(createUserPath, userE);
		userF = generateUserData();
		userFData = await createItem(createUserPath, userF);

		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();
	});

	describe('Copy Requests And Invites', () => {
		beforeEach(async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);

			/* Source Contest */
			sourceContest = await createContest();
			targetContest = await createContest();

			// Make userA and userB request to be a participant of the source contest
			await requestToJoinContest(userA, sourceContest.data.ref, 'participant');
			await requestToJoinContest(userB, sourceContest.data.ref, 'participant');

			// Make userC and userD request to be an admin of the source contest
			await requestToJoinContest(userC, sourceContest.data.ref, 'admin');
			await requestToJoinContest(userD, sourceContest.data.ref, 'admin');

			// Prepare Request Options
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.transform = null;
			options.method = 'POST';
		});

		/* Positive tests */

		it('should be successful and return proper data for all pending [requests] for [participant]', async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${sourceContest.data.ref}/requests/participant`,
				'POST'
			);

			// Execute the copying requests
			let results = await request(options);

			// Get the list of pending requests for the target contest
			options.method = 'GET';
			options.uri = signPath(`/team/${targetContest.data.ref}/join/pending`);
			let targetContestJoinRequests = await request(options);
			let participantRequests = _filter(targetContestJoinRequests, ['role', 'participant']);
			let adminRequests = _filter(targetContestJoinRequests, ['role', 'admin']);

			// Check total number of requests
			expect(targetContestJoinRequests.length).to.equal(2);

			// Since we got 2 requests for participant, we expect them to be copied
			expect(participantRequests.length).to.equal(2);

			// The rolekey is set to "participant" so no admin requests should be copied
			expect(adminRequests.length).to.equal(0);

			// Make sure that the correct user_refs where copied
			let requestors = _pluck(participantRequests, 'user');
			let participantRequestsUserRefs = _pluck(requestors, 'ref');
			expect(participantRequestsUserRefs.includes(userAData.data.ref)).to.equal(true);
			expect(participantRequestsUserRefs.includes(userBData.data.ref)).to.equal(true);
		});

		it('should be successful and return proper data for all pending [requests] for [admin]', async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${sourceContest.data.ref}/requests/admin`,
				'POST'
			);

			// Execute the copying requests
			let results = await request(options);

			// Get the list of pending requests for the target contest
			options.method = 'GET';
			options.uri = signPath(`/team/${targetContest.data.ref}/join/pending`);
			let targetContestJoinRequests = await request(options);
			let participantRequests = _filter(targetContestJoinRequests, ['role', 'participant']);
			let adminRequests = _filter(targetContestJoinRequests, ['role', 'admin']);

			// Check total number of requests
			expect(targetContestJoinRequests.length).to.equal(2);

			// Since we got 2 requests for admin, we expect them to be copied
			expect(adminRequests.length).to.equal(2);

			// The rolekey is set to "admin" so no participant requests should be copied
			expect(participantRequests.length).to.equal(0);

			// Make sure that the correct user_refs where copied
			let requestors = _pluck(adminRequests, 'user');
			let adminRequestsUserRefs = _pluck(requestors, 'ref');
			expect(adminRequestsUserRefs.includes(userCData.data.ref)).to.equal(true);
			expect(adminRequestsUserRefs.includes(userDData.data.ref)).to.equal(true);
		});

		it('should be successful and proper data for all pending [invites] for [participant]', async () => {
			/*
				todo: add logic and functionality for this test later after aadding the functionality for inviting contest admin or participant
				This test depends on https://trello.com/c/k5pbN8dP/2215-contest-2215-invite-contest-admin-or-participant
			*/
		});

		it('should be successful and proper data for all pending [invites] for [admin]', async () => {
			/*
				todo: add logic and functionality for this test later after aadding the functionality for inviting contest admin or participant
				This test depends on https://trello.com/c/k5pbN8dP/2215-contest-2215-invite-contest-admin-or-participant
			*/
		});

		/* Negative tests */

		it('should return an error if the user is not authorized in the source team', async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${sourceContest.data.ref}/requests/participant`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is not authorized in the target team', async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${sourceContest.data.ref}/requests/admin`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the source and target team are the same', async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${targetContest.data.ref}/requests/participant`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the source team is a traditional team', async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${traditionalTeam.data.ref}/requests/participant`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the target team is a traditional team', async () => {
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/copy-from/contest/${sourceContest.data.ref}/requests/admin`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the source team is invalid', async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${makeUniqueString()}/requests/admin`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the target team is invalid', async () => {
			options.uri = signPath(
				`/contest/${makeUniqueString()}/copy-from/contest/${sourceContest.data.ref}/requests/admin`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it("should return an error if the user's role to copy is invalid (random input)", async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${
					sourceContest.data.ref
				}/requests/${makeUniqueString()}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it("should return an error if the user's role to copy is invalid (known excluded team roles)", async () => {
			let targetRoles = [
				'creator',
				'owner',
				'leader',
				'guide',
				'member',
				'editor',
				'follow',
				'like',
			];
			for (let i = 0; i < targetRoles.length; i++) {
				let role = targetRoles[i];
				options.uri = signPath(
					`/contest/${targetContest.data.ref}/copy-from/contest/${sourceContest.data.ref}/requests/${role}`,
					'POST'
				);
				await checkStatusCodeByOptions(options, 400);
			}
		});
	});
});
