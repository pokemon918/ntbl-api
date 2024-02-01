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
	checkContestTeamData,
	getContest,
	createContest,
	createTraditionalTeam,
} = require('../common.js');

describe('Contest Team', () => {
	let options,
		path,
		contestData,
		contestTeam,
		contestAdmin,
		contestAdminData,
		user,
		userData,
		usedHandle;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		// Create Users
		contestAdmin = generateUserData();
		contestAdminData = await createItem(createUserPath, contestAdmin);

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		// Simulate login
		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create a test contest
		contestTeam = await createContest();
	});

	describe('Create Division Team', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
				handle: makeUniqueString(),
			};
			options.uri = signPath(`/contest/${contestTeam.data.ref}/add/team`, 'POST');
		});

		/* Positive tests */
		it('should return correct status code', async () => {
			await checkStatusCodeByOptions(options, 201);
		});

		it('should return proper data', async () => {
			// Get the count of the contest division teams before adding a new one.
			options.method = 'GET';
			options.uri = signPath(`/contest/${contestTeam.data.ref}`, 'GET');
			let responseBeforeAdd = await request(options);
			let contestBeforeAdd = responseBeforeAdd.data;
			let numberOfTeamsBeforeAdd = contestBeforeAdd.teams.length;

			// Add a contest division team
			options.method = 'POST';
			options.uri = signPath(`/contest/${contestTeam.data.ref}/add/team`, 'POST');
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			let numberOfTeams = updatedContest.data.teams.length;
			checkContestTeamData(updatedContest.data, 'admin');

			// Should return the contest (as if GET contest/[ref] is called) and not the division.
			expect(updatedContest.data.type).to.equal('contest');

			// The number of division teams should now be more than one, before adding the new division team
			expect(numberOfTeams).to.equal(numberOfTeamsBeforeAdd + 1);
		});

		it('should ignore all other fields except for name, description and handle', async () => {
			options.body = {
				handle: makeUniqueString(),
				name: makeUniqueString(),
				description: makeUniqueString(100),
				handle: makeUniqueString(),
				alias: {
					admin: makeUniqueString(),
					leader: makeUniqueString(),
					guide: makeUniqueString(),
					member: makeUniqueString(),
					collection: makeUniqueString(),
					theme: makeUniqueString(),
				},
				city: makeUniqueString(),
				country: makeUniqueString(),
				visibility: 'open',
			};

			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			let divisionTeam = updatedContest.data.teams[2];
			let alias = contestTeam.data.alias;
			let payloadAlias = options.body.alias;
			usedHandle = options.body.handle;

			expect(divisionTeam.name).to.equal(options.body.name);
			expect(divisionTeam.description).to.equal(options.body.description);
			expect(divisionTeam.handle).to.equal(options.body.handle);
			expect(alias.admin).to.not.equal(payloadAlias.admin);
			expect(alias.leader).to.not.equal(payloadAlias.leader);
			expect(alias.guide).to.not.equal(payloadAlias.guide);
			expect(alias.member).to.not.equal(payloadAlias.member);
			expect(alias.collection).to.not.equal(payloadAlias.collection);

			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(`/team/${divisionTeam.ref}`, 'GET');
			divisionTeam = await request(options);

			expect(divisionTeam.name).to.equal(options.body.name);
			expect(divisionTeam.description).to.equal(options.body.description);
			expect(divisionTeam.handle).to.equal(options.body.handle);
			expect(divisionTeam.type).to.equal('division');
			expect(divisionTeam.city).to.not.equal(options.body.city);
			expect(divisionTeam.country).to.not.equal(options.body.country);
			expect(divisionTeam.visibility).to.not.equal(options.body.visibility);
		});

		it('should have a randome [handle] when not provided', async () => {
			delete options.body.handle;
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			let divisionTeam = updatedContest.data.teams[3];
			expect(divisionTeam.handle).to.be.a('string');
			expect(divisionTeam.handle.length).to.be.at.least(6);
		});

		it('should return an error if [handle] is present and already taken', async () => {
			options.body.handle = usedHandle;
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			let divisionTeam = updatedContest.data.teams[3];
			expect(divisionTeam.handle).to.be.a('string');
			expect(divisionTeam.handle.length).to.be.at.least(6);
		});

		// Negative Tests
		it('should return return error when adding a division team to a non-existing contest', async () => {
			let nonExistingRef = makeUniqueString();
			options.uri = signPath(`/contest/${nonExistingRef}/add/team`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return return error when adding a division team to team of type [traditional]', async () => {
			// Add a traditional team for testing
			let traditionalTeam = await createTraditionalTeam();

			// Attempt to add a division to the traditional team
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
			};
			options.uri = signPath(`/contest/${traditionalTeam.data.ref}/add/team`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return return error when adding a division team to team of type [division]', async () => {
			// Add a division team for testing
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			let divisionTeams = updatedContest.data.teams;

			// Attempt to add a division to another division team
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(100),
			};
			options.uri = signPath(`/contest/${divisionTeams[0].ref}/add/team`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [name] is missing in payload', async () => {
			options.body = {
				description: makeUniqueString(100),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [name] is null', async () => {
			options.body = {
				name: null,
				description: makeUniqueString(100),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [name] is empty', async () => {
			options.body = {
				name: '',
				description: makeUniqueString(100),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [name] is empty (whitespace)', async () => {
			options.body = {
				name: '   ',
				description: makeUniqueString(100),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [name] exceeds max length of 255', async () => {
			options.body = {
				name: 'a'.repeat(255 + 1),
				description: makeUniqueString(100),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [name] is empty', async () => {
			options.body = {
				name: '',
				description: makeUniqueString(100),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [description] exceeds max length of 4000', async () => {
			options.body = {
				name: makeUniqueString(),
				description: 'a'.repeat(4000 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if ["handle"] is present and empty', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				handle: '',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if ["handle"] is present and exceeds max length of 255', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				handle: makeUniqueString(256),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is not a [contest admin]', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/add/team`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
