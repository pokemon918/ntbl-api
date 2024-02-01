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
	getContest,
	createContest,
	createContestCollection,
	createTraditionalTeam,
	createTraditionalCollection,
} = require('../common.js');

describe('Contest', () => {
	let options,
		creator,
		creatorData,
		contestTeam,
		contestCollection,
		traditionalTeam,
		traditionalCollection;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		await login(creator.email, creator.rawPass);

		// Create Contest Team
		contestTeam = await createContest();

		// Create Contest Collection
		contestCollection = await createContestCollection(contestTeam.data.ref);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();

		// Create Traditional Collection
		traditionalCollection = await createTraditionalCollection();
	});

	describe('Remove Collection', () => {
		beforeEach(async () => {
			options.method = 'POST';
			options.transform = null;
			options.body = {
				name: 'Contest Collection',
				description: 'Collection for a Contest Team',
			};
			options.uri = signPath(
				'/contest/' + contestTeam.data.ref + '/remove/collection/' + contestCollection.ref,
				'POST'
			);
		});

		/* Positive tests */
		it('should be successful and return proper data', async () => {
			// Get the contest by ref before removing the collection for comparison
			options.method = 'GET';
			options.uri = signPath('/contest/' + contestTeam.data.ref, 'GET');
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			let contest = updatedContest.data;
			let contestCollections = contest.collections;

			// There should at least be one collection in the contest collections
			expect(contestCollections.length).to.equal(1);

			// The given collection ref must be included in the contest.collections before being removed
			expect(contestCollection.ref).to.equal(contestCollections[0].ref);

			options.method = 'POST';
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			options.uri = signPath(
				'/contest/' + contestTeam.data.ref + '/remove/collection/' + contestCollection.ref,
				'POST'
			);
			response = await request(options);
			updatedContest = await getContest(contestTeam.data.ref);
			contest = updatedContest.data;
			contestCollections = contest.collections;
			expect(response.statusCode).to.equal(200);

			// There must be no contest collections since it was already removed
			expect(contestCollections.length).to.equal(0);
		});

		it('should no longer be part of contest data', async () => {
			options.method = 'GET';
			options.uri = signPath('/contest/' + contestTeam.data.ref, 'GET');
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			let collectionRefs = updatedContest.data.collections.map((collection) => collection.ref);
			expect(collectionRefs.includes(contestCollection.ref)).to.equal(false);
		});

		/* Negative tests */
		it('should not be able to remove an already removed contest collection', async () => {
			options.uri = signPath(
				'/contest/' + contestTeam.data.ref + '/remove/collection/' + contestCollection.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove [contest] collection to a [traditional] team', async () => {
			options.uri = signPath(
				'/contest/' + traditionalTeam.data.ref + '/remove/collection/' + contestCollection.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove [traditional] collection to a [contest] team', async () => {
			options.uri = signPath(
				'/contest/' + traditionalTeam.data.ref + '/remove/collection/' + contestTeam.data.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove [traditional] collection to a [traditional] team', async () => {
			options.uri = signPath(
				'/contest/' + traditionalTeam.data.ref + '/remove/collection/' + traditionalTeam.data.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove collection using invalid contest team ref', async () => {
			options.uri = signPath(
				'/contest/' + makeUniqueString() + '/remove/collection/' + contestCollection.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove collection using invalid contest collection ref', async () => {
			options.uri = signPath(
				'/contest/' + traditionalTeam.data.ref + '/remove/collection/' + makeUniqueString(),
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove collection as participant', async () => {
			let roleRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant');

			// Approve the request and become a participant
			await login(creator.email, creator.rawPass);
			options.uri = signPath(
				'/team/' + contestTeam.data.ref + '/accept/' + roleRequest.request.ref,
				'POST'
			);
			await request(options);

			// Attempt to add a collection
			await login(roleRequest.user.email, roleRequest.user.rawPass);
			options.uri = signPath('/contest/' + contestTeam.data.ref + '/add/collection', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
