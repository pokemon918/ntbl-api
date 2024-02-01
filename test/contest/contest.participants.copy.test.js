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
	requestToJoinContest,
	approveJoinRequest,
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
		adminB,
		adminC,
		adminD,
		adminE,
		adminF,
		adminG,
		participantA,
		participantB,
		participantC,
		participantD,
		participantE,
		participantF,
		participantG,
		anotherContestAdmin,
		anotherContestAdminData,
		user,
		userData,
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

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();
	});

	describe('Copy Participants', () => {
		beforeEach(async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);

			/* Source Contest */
			sourceContest = await createContest();

			// Create Source Admins
			adminA = await createContestParticipant(contestAdmin, sourceContest.data.ref, 'admin');
			adminB = await createContestParticipant(contestAdmin, sourceContest.data.ref, 'admin');
			adminC = await createContestParticipant(contestAdmin, sourceContest.data.ref, 'admin');

			// Create Source Participants
			participantA = await createContestParticipant(contestAdmin, sourceContest.data.ref);
			participantB = await createContestParticipant(contestAdmin, sourceContest.data.ref);
			participantC = await createContestParticipant(contestAdmin, sourceContest.data.ref);

			// Create Users with Pending Join Request
			adminG = await generateJoinContestRequest(sourceContest.data.ref, 'admin');
			participantG = await generateJoinContestRequest(sourceContest.data.ref, 'participant');

			/* Target Contest */
			await login(contestAdmin.email, contestAdmin.rawPass);
			targetContest = await createContest();

			// Create Target Admins
			adminD = await createContestParticipant(contestAdmin, targetContest.data.ref, 'admin');
			adminE = await createContestParticipant(contestAdmin, targetContest.data.ref, 'admin');
			adminF = await createContestParticipant(contestAdmin, targetContest.data.ref, 'admin');

			// Assign an admin from source contest to target contest, to test copying of owner (as an admin)
			let assignment = await requestToJoinContest(adminB, targetContest.data.ref, 'admin');
			let assignmentApproval = await approveJoinRequest(
				contestAdmin,
				targetContest.data.ref,
				assignment.data.ref
			);

			// Create Target Participants
			participantD = await createContestParticipant(contestAdmin, targetContest.data.ref);
			participantE = await createContestParticipant(contestAdmin, targetContest.data.ref);
			participantF = await createContestParticipant(contestAdmin, targetContest.data.ref);

			// Create Join Request on Source (that should be ignored if user has any existing relation)
			await requestToJoinContest(adminF, sourceContest.data.ref, 'participant');
			await requestToJoinContest(participantF, sourceContest.data.ref, 'participant');

			// Prepare Request Options
			await login(contestAdmin.email, contestAdmin.rawPass);
			targetRole = 'participant';
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${sourceContest.data.ref}/${targetRole}`,
				'POST'
			);
		});

		/* Positive tests */

		it('should be successful and return proper data when copying [admin]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			targetRole = 'admin';
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${sourceContest.data.ref}/${targetRole}`,
				'POST'
			);

			let sourceParticipants = [participantA, participantB, participantC];
			let newTargetAdmins = [adminB, adminC];

			let existingTargetAdmins = [contestAdmin, adminA, adminD, adminE, adminF];
			let existingTargetParticipants = [participantD, participantE, participantF];
			let contestCopy = await request(options);
			let updatedTargetContest = await getContest(targetContest.data.ref);

			let updatedAdmins = updatedTargetContest.data.admins.map((targetAdmin) => targetAdmin.ref);
			let updatedParticipants = updatedTargetContest.data.participants.map(
				(targetParticipant) => targetParticipant.ref
			);

			// Expect New Admins
			for (let i = 0; i < newTargetAdmins; i++) {
				let newAdmin = newTargetAdmins[i];
				expect(updatedAdmins.includes(newAdmin.ref));
			}

			// Expect Same Participants
			for (let i = 0; i < sourceParticipants; i++) {
				let sourceParticipant = sourceParticipants[i];
				expect(updatedParticipants.includes(sourceParticipant.ref));
			}

			// Source Participants should not be transferred
			for (let i = 0; i < existingTargetParticipants; i++) {
				let existingTargetParticipant = existingTargetParticipants[i];
				expect(!updatedParticipants.includes(existingTargetParticipant.ref));
			}

			// Should Copy Pending Join Requests of the requested role type and retain original ignore functionality
			options.method = 'GET';
			options.uri = signPath(`/team/${targetContest.data.ref}/join/pending`);
			let targetContestJoinRequests = await request(options);
			expect(targetContestJoinRequests.length).to.equal(1);
			let copiedRequest = targetContestJoinRequests.find((request) => {
				return request.user.ref === adminG.user.ref;
			});

			expect(copiedRequest).to.not.equal(undefined);
		});

		it('should be successful and return proper data when copying [participant]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			targetRole = 'participant';
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${sourceContest.data.ref}/${targetRole}`,
				'POST'
			);

			let sourceParticipants = [participantA, participantB, participantC];
			let uncopiedSourceAdmins = [adminB, adminC];

			let existingTargetAdmins = [contestAdmin, adminA, adminD, adminE, adminF];
			let existingTargetParticipants = [participantD, participantE, participantF];
			let contestCopy = await request(options);
			let updatedTargetContest = await getContest(targetContest.data.ref);

			let updatedAdmins = updatedTargetContest.data.admins.map((targetAdmin) => targetAdmin.ref);
			let updatedParticipants = updatedTargetContest.data.participants.map(
				(targetParticipant) => targetParticipant.ref
			);

			// Expect New Participants
			for (let i = 0; i < sourceParticipants; i++) {
				let sourceParticipant = sourceParticipants[i];
				expect(updatedParticipants.includes(sourceParticipant.ref));
			}

			// Expect Same Admins
			for (let i = 0; i < sourceParticipants; i++) {
				let sourceParticipant = sourceParticipants[i];
				expect(updatedAdmins.includes(sourceParticipant.ref));
			}

			// Source Admins should not be transferred
			for (let i = 0; i < uncopiedSourceAdmins; i++) {
				let uncopiedSourceAdmin = uncopiedSourceAdmins[i];
				expect(!updatedAdmins.includes(uncopiedSourceAdmin.ref));
			}

			// Should Copy Pending Join Requests of the requested role type and retain original ignore functionality
			options.method = 'GET';
			options.uri = signPath(`/team/${targetContest.data.ref}/join/pending`);
			let targetContestJoinRequests = await request(options);
			expect(targetContestJoinRequests.length).to.equal(1);
			let copiedRequest = targetContestJoinRequests.find((request) => {
				return request.user.ref === participantG.user.ref;
			});
			expect(copiedRequest).to.not.equal(undefined);
		});

		/* Negative tests */

		it('should return an error if the user is not authorized in the source team', async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/copy-from/contest/${targetContest.data.ref}/${targetRole}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is not authorized in the target team', async () => {
			await login(anotherContestAdmin.email, anotherContestAdmin.rawPass);
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/copy-from/contest/${targetContest.data.ref}/${targetRole}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the source and target team are the same', async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${targetContest.data.ref}/${targetRole}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the source team is a traditional team', async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${traditionalTeam.data.ref}/${targetRole}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the target team is a traditional team', async () => {
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/copy-from/contest/${sourceContest.data.ref}/${targetRole}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the source team is invalid', async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${makeUniqueString()}/${targetRole}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the target team is invalid', async () => {
			options.uri = signPath(
				`/contest/${makeUniqueString()}/copy-from/contest/${sourceContest.data.ref}/${targetRole}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it("should return an error if the user's role to copy is invalid (random input)", async () => {
			options.uri = signPath(
				`/contest/${targetContest.data.ref}/copy-from/contest/${
					sourceContest.data.ref
				}/${makeUniqueString()}`,
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
					`/contest/${targetContest.data.ref}/copy-from/contest/${sourceContest.data.ref}/${role}`,
					'POST'
				);
				await checkStatusCodeByOptions(options, 400);
			}
		});
	});
});
