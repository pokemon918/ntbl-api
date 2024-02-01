const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	generateJoinContestRequest,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	createContest,
	createTraditionalTeam,
} = require('../common.js');

describe('Contest', () => {
	let options,
		creator,
		creatorData,
		joiner,
		joinerData,
		joinRequest,
		contestTeamResponse,
		traditionalTeamResponse;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		joiner = generateUserData();
		joinerData = await createItem(createUserPath, joiner);

		await login(creator.email, creator.rawPass);

		// Create Contest Team
		contestTeamResponse = await createContest();

		// Create Traditional Team
		traditionalTeamResponse = await createTraditionalTeam();

		await login(joiner.email, joiner.rawPass);
	});

	describe('Request Role', () => {
		beforeEach(async () => {
			options.method = 'POST';
			options.body = null;
			options.transform = null;
		});

		/* Positive tests */
		it('should be successful and return proper data', async () => {
			let relationType = 'admin';
			options.uri = signPath(
				'/contest/' + contestTeamResponse.data.ref + '/request/role/' + relationType,
				'POST'
			);

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			joinRequest = await request(options);
			expect(joinRequest.statusCode).to.equal(200);
			expect(joinRequest.body.data.ref.length).to.be.above(0);
			expect(joinRequest.body.data.status).to.equal('pending');
			expect(joinRequest.body.data.status).to.equal('pending');
			expect(joinRequest.body.data.user_ref).to.equal(joinerData.data.ref);
			expect(joinRequest.body.data.team_ref).to.equal(contestTeamResponse.data.ref);
			expect(joinRequest.body.data.requested).to.equal(relationType);
		});

		it('should be able to reapply as another role', async () => {
			let relationType = 'participant';
			options.uri = signPath(
				'/contest/' + contestTeamResponse.data.ref + '/request/role/' + relationType,
				'POST'
			);

			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			joinRequest = await request(options);
			expect(joinRequest.statusCode).to.equal(200);
			expect(joinRequest.body.data.ref.length).to.be.above(0);
			expect(joinRequest.body.data.status).to.equal('pending');
			expect(joinRequest.body.data.status).to.equal('pending');
			expect(joinRequest.body.data.user_ref).to.equal(joinerData.data.ref);
			expect(joinRequest.body.data.team_ref).to.equal(contestTeamResponse.data.ref);
			expect(joinRequest.body.data.requested).to.equal(relationType);
		});

		/* Negative tests */
		it('should not be able to request join if already has pending join request of the same type', async () => {
			let relationType = 'participant';
			options.uri = signPath(
				'/contest/' + contestTeamResponse.data.ref + '/request/role/' + relationType,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to request to join if contest team ref is invalid', async () => {
			options.uri = signPath(
				'/contest/' + contestTeamResponse.data.ref + '/request/role/' + makeUniqueString(),
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to request to join if team ref is not of a contest type', async () => {
			await login(joiner.email, joiner.rawPass);
			options.uri = signPath(
				'/contest/' + traditionalTeamResponse.data.ref + '/request/role/' + makeUniqueString(),
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to request to join if relation type is invalid', async () => {
			let relationType = makeUniqueString();
			options.uri = signPath(
				'/contest/' + contestTeamResponse.data.ref + '/request/role/' + relationType,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to request to join if already either an admin or participant - admin', async () => {
			let otherJoinRequest = await generateJoinContestRequest(
				contestTeamResponse.data.ref,
				'admin'
			);

			// Approve the request and become an admin
			await login(creator.email, creator.rawPass);
			options.uri = signPath(
				'/team/' + contestTeamResponse.data.ref + '/accept/' + otherJoinRequest.request.ref,
				'POST'
			);
			await request(options);

			// Attempt to join as participant
			await login(otherJoinRequest.user.email, otherJoinRequest.user.rawPass);
			let relationType = 'participant';
			options.uri = signPath(
				'/contest/' + contestTeamResponse.data.ref + '/request/role/' + relationType,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to request to join if already either an admin or participant - participant', async () => {
			let otherJoinRequest = await generateJoinContestRequest(
				contestTeamResponse.data.ref,
				'participant'
			);

			// Approve the request and become a participant
			await login(creator.email, creator.rawPass);
			options.uri = signPath(
				'/team/' + contestTeamResponse.data.ref + '/accept/' + otherJoinRequest.request.ref,
				'POST'
			);
			await request(options);

			// Attempt to join as admin
			await login(otherJoinRequest.user.email, otherJoinRequest.user.rawPass);
			let relationType = 'admin';
			options.uri = signPath(
				'/contest/' + contestTeamResponse.data.ref + '/request/role/' + relationType,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to request to join as admin if already an admin', async () => {
			let otherJoinRequest = await generateJoinContestRequest(
				contestTeamResponse.data.ref,
				'admin'
			);

			// Approve the request and become a participant
			await login(creator.email, creator.rawPass);
			options.uri = signPath(
				'/team/' + contestTeamResponse.data.ref + '/accept/' + otherJoinRequest.request.ref,
				'POST'
			);
			await request(options);

			// Attempt to join as admin
			await login(otherJoinRequest.user.email, otherJoinRequest.user.rawPass);
			let relationType = 'admin';
			options.uri = signPath(
				'/contest/' + contestTeamResponse.data.ref + '/request/role/' + relationType,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to request to join as admin if already a participant', async () => {
			let otherJoinRequest = await generateJoinContestRequest(
				contestTeamResponse.data.ref,
				'participant'
			);

			// Approve the request and become a participant
			await login(creator.email, creator.rawPass);
			options.uri = signPath(
				'/team/' + contestTeamResponse.data.ref + '/accept/' + otherJoinRequest.request.ref,
				'POST'
			);
			await request(options);

			// Attempt to join as admin
			await login(otherJoinRequest.user.email, otherJoinRequest.user.rawPass);
			let relationType = 'participant';
			options.uri = signPath(
				'/contest/' + contestTeamResponse.data.ref + '/request/role/' + relationType,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
