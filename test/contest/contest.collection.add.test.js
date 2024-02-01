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
	checkContestTeamData,
	getBackendTime,
	getContest,
	createContest,
	createTraditionalTeam,
} = require('../common.js');

describe('Contest', () => {
	let options, creator, creatorData, contestTeam, traditionalTeam, contestCollection, contestTheme;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		await login(creator.email, creator.rawPass);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();
	});

	describe('Add Collection', () => {
		beforeEach(async () => {
			// Create Contest Team
			contestTeam = await createContest();

			contestTheme = makeUniqueString();
			options.method = 'POST';
			options.transform = null;
			options.body = {
				name: 'Contest Collection',
				description: 'Collection for a Contest Team',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
				theme: contestTheme,
				metadata: JSON.stringify({field: 'test sample'}),
			};
			options.uri = signPath('/contest/' + contestTeam.data.ref + '/add/collection', 'POST');
		});

		/* Positive tests */
		it('should be successful and return proper data', async () => {
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			checkContestTeamData(updatedContest.data, 'admin');
			contestCollection = updatedContest.data.collections[0];

			expect(contestCollection.ref.length).to.be.above(0);
			expect(contestCollection.name).to.equal(options.body.name);
			expect(contestCollection.theme).to.equal(options.body.theme);
			expect(contestCollection.start_date).to.equal(options.body.start_date);
			expect(contestCollection.end_date).to.equal(options.body.end_date);
			let baseMetadata = JSON.parse(options.body.metadata);
			expect(contestCollection.metadata.field).to.equal(baseMetadata.field);
		});

		it('should be part of contest data', async () => {
			// Add a collection
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			let contest = updatedContest.data;
			contestCollection = contest.collections[0];

			// Get contest data through GET contest/[ref]
			options.method = 'GET';
			options.uri = signPath('/contest/' + contestTeam.data.ref, 'GET');
			response = await request(options);

			// The newly added collection should be part of the contest data
			let collectionRefs = response.data.collections.map((collection) => collection.ref);
			let contestThemes = response.data.themes;

			expect(collectionRefs.includes(contestCollection.ref)).to.equal(true);
			expect(contestThemes.includes(contestTheme)).to.equal(true);
		});

		it('should be successful and ignore all other fields of a traditional collection', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
				sub_type: 'blind',
			};

			await checkStatusCodeByOptions(options, 201);
		});

		/* Negative tests */

		it('should not be able to add collection to a [traditional] team', async () => {
			options.uri = signPath('/contest/' + traditionalTeam.data.ref + '/add/collection', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add collection using invalid contest team ref', async () => {
			options.uri = signPath('/contest/' + makeUniqueString() + '/add/collection', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload is empty', async () => {
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload is null', async () => {
			options.body = null;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [name] exceeds 255', async () => {
			options.body.name = makeUniqueString(256);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [description] exceeds 4000', async () => {
			options.body.description = makeUniqueString(4001);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [theme] exceeds 128', async () => {
			options.body.theme = makeUniqueString(129);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [theme] is not a string[numeric]', async () => {
			options.body.theme = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [theme] is not a string[array]', async () => {
			options.body.theme = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [theme] is not a string[object]', async () => {
			options.body.theme = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [start_date] is not a date', async () => {
			options.body.start_date = makeUniqueString();
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [start_date] is not a date[numeric]', async () => {
			options.body.start_date = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [start_date] is not a date[array]', async () => {
			options.body.start_date = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [start_date] is not a date[object]', async () => {
			options.body.start_date = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [end_date] is not a date', async () => {
			options.body.end_date = makeUniqueString();
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [end_date] is not a date[numeric]', async () => {
			options.body.end_date = 123;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [end_date] is not a date[array]', async () => {
			options.body.end_date = [];
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [end_date] is not a date[object]', async () => {
			options.body.end_date = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error when events filled with start_date has missing end_date', async () => {
			delete options.body.end_date;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error when events filled with end_date has missing start_date', async () => {
			delete options.body.start_date;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error when users enter an event end date prior to the event start date.', async () => {
			options.body.start_date = await getBackendTime(10);
			options.body.end_date = await getBackendTime(1);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add collection as participant', async () => {
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
