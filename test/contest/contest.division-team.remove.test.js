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
	createContestDivision,
	createTraditionalTeam,
} = require('../common.js');

describe('Contest Team', () => {
	let options,
		path,
		contestData,
		contestTeam,
		divisionTeam,
		anotherContestTeam,
		anotherContestDivision,
		contestAdmin,
		contestAdminData,
		user,
		userData;

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

		// Create Another Contest Team for testing
		anotherContestTeam = await createContest();

		// Create a Division that belongs to another Contest
		anotherContestDivision = await createContestDivision(anotherContestTeam.data.ref);
	});

	describe('Remove Division Team', () => {
		beforeEach(async () => {
			// Add a division before each tests for testing
			divisionTeam = await createContestDivision(contestTeam.data.ref);

			// Now setup the options for removing the division team.
			options.body = null;
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/remove/team/${divisionTeam.ref}`,
				'POST'
			);
		});

		// Positive tests
		it('should return correct status code', async () => {
			await checkStatusCodeByOptions(options, 202);
		});

		it('should return proper data', async () => {
			let response = await request(options);
			let updatedContest = await getContest(contestTeam.data.ref);
			let teams = updatedContest.data.teams;
			checkContestTeamData(updatedContest.data, 'admin');
			// Since the division has already been deleted, it should no longer be included in the contest's teams
			expect(teams.includes(divisionTeam.ref)).to.equal(false);
		});

		// Negative Tests
		it('should return return error when removing a division team that is already removed', async () => {
			await request(options);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/remove/team/${divisionTeam.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return return error when removing a division team from a non-existing contest', async () => {
			let nonExistingRef = makeUniqueString();
			options.uri = signPath(`/contest/${nonExistingRef}/remove/team/${divisionTeam.ref}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return return error when removing a non-existing division team', async () => {
			let nonExistingRef = makeUniqueString();
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/remove/team/${nonExistingRef}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return return error when removing a division team to team of type [traditional]', async () => {
			// Add a traditional team for testing
			let traditionalTeam = await createTraditionalTeam();

			// Attempt to remove a division to the traditional team
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/remove/team/${divisionTeam.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return return error when removing a division team to team of type [division]', async () => {
			// Attempt to remove a division to the division team
			let newDivisionTeam = await createContestDivision(contestTeam.data.ref);

			// Attempt to remove a division to the traditional team
			options.uri = signPath(
				`/contest/${newDivisionTeam.ref}/remove/team/${divisionTeam.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove if contest division does not belong to the contest', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/remove/team/${anotherContestDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is not a [contest admin]', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(`/contest/${contestTeam.data.ref}/add/team`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
