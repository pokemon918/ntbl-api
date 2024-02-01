const expect = require('chai').expect;
const request = require('request-promise');

const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	isParticipantAssignedToDivision,
	getContest,
	createContest,
	createContestDivision,
	createContestParticipant,
	createTraditionalTeam,
} = require('../common.js');

describe('Contest', () => {
	let options,
		creator,
		creatorData,
		user,
		userData,
		contestTeam,
		traditionalTeam,
		participant,
		division,
		anotherDivision;

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

		// Create Participant
		participant = await createContestParticipant(creator, contestTeam.data.ref, 'participant');

		// Create Division
		division = await createContestDivision(contestTeam.data.ref);

		// Create Another Division
		anotherDivision = await createContestDivision(contestTeam.data.ref);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();
	});

	describe('Assign Participant', () => {
		beforeEach(async () => {
			options.method = 'POST';
			options.transform = null;
			options.body = {};
		});

		/* Positive tests */
		it('should be successful and return proper data', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/put/${participant.ref}/on/${division.ref}`,
				'POST'
			);

			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let participants = updatedContest.data.participants;
			isParticipantAssignedToDivision(participants, participant.ref, division.ref);
		});

		it('should be able to re-assign to another team', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/put/${participant.ref}/on/${anotherDivision.ref}`,
				'POST'
			);

			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let participants = updatedContest.data.participants;
			isParticipantAssignedToDivision(participants, participant.ref, anotherDivision.ref);
		});

		/* Negative tests */

		it('should not be able to re-assign on the same team', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/put/${participant.ref}/on/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign on a traditional team', async () => {
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/put/${participant.ref}/on/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign with an invalid contest', async () => {
			options.uri = signPath(
				`/contest/${makeUniqueString()}/put/${participant.ref}/on/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign an invalid participant', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/put/${makeUniqueString()}/on/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign on an invalid division', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/put/${participant.ref}/on/${makeUniqueString()}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign using a non-authorized user', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/put/${participant.ref}/on/${division.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
