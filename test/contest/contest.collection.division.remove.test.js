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
	getContest,
	createContest,
	createContestDivision,
	createContestCollection,
	createContestParticipant,
	assignContestCollectionToDivision,
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
		anotherContestTeam,
		contestCollection,
		anotherContestCollection,
		participant,
		division,
		anotherDivision,
		anotherContestDivision,
		traditionalTeam,
		traditionalCollection;

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

		// Create Another Contest Team for testing
		anotherContestTeam = await createContest();

		// Create Participant
		participant = await createContestParticipant(creator, contestTeam.data.ref, 'participant');

		// Create Division
		division = await createContestDivision(contestTeam.data.ref);

		// Create Another Division
		anotherDivision = await createContestDivision(contestTeam.data.ref);

		// Create a Division that belongs to another Contest
		anotherContestDivision = await createContestDivision(anotherContestTeam.data.ref);

		// Create Contest Collection
		contestCollection = await createContestCollection(contestTeam.data.ref);

		// Create a Collection that belongs to another Contest
		anotherContestCollection = await createContestCollection(anotherContestTeam.data.ref);

		// Assign Contest Collection
		await assignContestCollectionToDivision(
			contestTeam.data.ref,
			contestCollection.ref,
			division.ref
		);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();

		// Create Traditional Collection
		traditionalCollection = await createTraditionalCollection();
	});

	describe('Unassign Contest Collection', () => {
		beforeEach(async () => {
			options.method = 'POST';
			options.transform = null;
			options.body = {};
		});

		/* Positive tests */
		it('should be successful and return proper data', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/remove/${division.ref}`,
				'POST'
			);

			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let divisionCollection = updatedContest.data.teams.find((divTeam) => {
				return divTeam.ref === division.ref;
			});

			expect(divisionCollection.ref).to.equal(division.ref);
			expect(divisionCollection.collections.includes(contestCollection.ref)).to.equal(false);
		});

		/* Negative tests */

		it('should not be able to remove if already removed', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/remove/${division.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove with divisions it is not assigned to', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/remove/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove using a traditional collection', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${traditionalCollection.data.ref}/remove/${division.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove using a traditional team (as contest)', async () => {
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/collection/${contestCollection.ref}/remove/${division.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove using a traditional team (as division)', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/remove/${traditionalTeam.data.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove if contest team is invalid', async () => {
			options.uri = signPath(
				`/contest/${makeUniqueString()}/collection/${contestCollection.ref}/remove/${division.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove if contest collection is invalid', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${makeUniqueString()}/remove/${division.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove if contest division is invalid', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${
					contestCollection.ref
				}/remove/${makeUniqueString()}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove if contest division does not belong to the contest', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/remove/${anotherContestDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove if contest collection does not belong to the contest', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${anotherContestCollection.ref}/remove/${division.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove using a non-authorized user', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/collection/${contestCollection.ref}/remove/${division.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
