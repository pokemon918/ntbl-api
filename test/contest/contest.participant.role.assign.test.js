const expect = require('chai').expect;
const request = require('request-promise');

const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	generateJoinContestRequest,
	approveJoinRequest,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	getContest,
	createContest,
	createContestDivision,
	createDivisionMemberWithRole,
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
		contestTeam,
		traditionalTeam,
		participant,
		division,
		roleKey,
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

		// Create Division
		division = await createContestDivision(contestTeam.data.ref);

		// Create Another Division
		anotherDivision = await createContestDivision(contestTeam.data.ref);

		// Create Participant
		participant = await createDivisionMemberWithRole(creator, contestTeam, division, 'member');

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();
	});

	describe("Assign Participant's Role in Division", () => {
		beforeEach(async () => {
			roleKey = 'leader';
			options.method = 'POST';
			options.transform = null;
			options.body = {};
		});

		/* Positive tests */
		it('should be successful and return proper data', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/let/${participant.ref}/be/${roleKey}`,
				'POST'
			);

			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let contestParticipant = updatedContest.data.participants.find((cp) => {
				return cp.ref === participant.ref;
			});

			expect(contestParticipant.division).to.equal(division.ref);
			expect(contestParticipant.role).to.equal(roleKey);
		});

		it('should be successful and return proper data if role is changed (member)', async () => {
			roleKey = 'member';
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/let/${participant.ref}/be/${roleKey}`,
				'POST'
			);

			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let contestParticipant = updatedContest.data.participants.find((cp) => {
				return cp.ref === participant.ref;
			});

			expect(contestParticipant.division).to.equal(division.ref);
			expect(contestParticipant.role).to.equal(roleKey);
		});

		/* Negative tests */

		it('should not be able to assign role on a traditional team', async () => {
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/let/${participant.ref}/be/${roleKey}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign role with an invalid contest', async () => {
			options.uri = signPath(
				`/contest/${makeUniqueString()}/let/${participant.ref}/be/${roleKey}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign role an invalid participant', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/let/${makeUniqueString()}/be/${roleKey}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign role on an non-existing role key', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/let/${participant.ref}/be/${makeUniqueString()}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign on an invalid non-division role key', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/let/${participant.ref}/be/editor`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign using a non-authorized user', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/let/${participant.ref}/be/${roleKey}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
