const expect = require('chai').expect;
const request = require('request-promise');
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];
const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	createContest,
	createContestDivision,
	createTraditionalTeam,
} = require('../common.js');

describe('Contest', () => {
	let options,
		user,
		userData,
		contestAdmin,
		contestAdminData,
		divisionLeader,
		divisionMember,
		participant,
		contestTeam,
		divisionTeam,
		traditionalTeam,
		checkProperTeamData,
		checkEmptyResultsData;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		// Create team contestAdmin
		contestAdmin = generateUserData();
		let contestAdminData = await createItem(createUserPath, contestAdmin);

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		// Simulate login
		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Contest Team
		contestTeam = await createContest();

		// Create Division Team
		divisionTeam = await createContestDivision(contestTeam.data.ref);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();

		checkProperTeamData = (team, baseTeam) => {
			// Check for property existence
			expect(team).to.not.have.property('id');
			expect(team).to.have.property('name');
			expect(team).to.have.property('handle');
			expect(team).to.have.property('description');
			expect(team).to.have.property('visibility');

			// Check for correct data type
			expect(team.name).to.be.a('string');
			expect(team.handle).to.be.a('string');
			expect(team.description).to.be.a('string');
			expect(team.visibility).to.be.a('string');

			// Check for value
			expect(team.name).to.equal(baseTeam.name);
			expect(team.handle).to.equal(baseTeam.handle);
			expect(team.description).to.equal(baseTeam.description);
		};

		checkEmptyResultsData = (response) => {
			let contest = response.body.data;
			expect(response.statusCode).to.equal(200);
			expect(response.body.status).to.equal('success');
			expect(response.body.message).to.equal('No contest found.');
			expect(contest).to.equal(null);
		};
	});

	describe('Search By Handle', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.body = {};
			options.uri = signPath(`/contest/search/handle/@${contestTeam.data.handle}`, 'GET');
		});

		/* Positive tests */

		// Atm contests are set to access type of hidden by default [hardcoded]
		it('should return proper data for [hidden] contest', async () => {
			let contest = await request(options);
			checkProperTeamData(contest.data, contestTeam.data);
		});

		it('should return proper data if "@" symbol is omitted', async () => {
			options.uri = signPath(`/contest/search/handle/${contestTeam.data.handle}`, 'GET');
			let contest = await request(options);
			checkProperTeamData(contest.data, contestTeam.data);
		});

		// todo: Add tests for access type public and private
		it('should be successful but return null with a message of "No contest found." for division type teams', async () => {
			options.uri = signPath(`/contest/search/handle/@${divisionTeam.handle}`, 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			checkEmptyResultsData(response);
		});

		it('should be successful but return null with a message of "No contest found." for traditional type teams', async () => {
			options.uri = signPath(`/contest/search/handle/@${traditionalTeam.data.handle}`, 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			checkEmptyResultsData(response);
		});

		it('should return error for invalid handle', async () => {
			let invalidHandle = makeUniqueString();
			options.uri = signPath(`/contest/search/handle/@${invalidHandle}`, 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			checkEmptyResultsData(response);
		});

		/* Negative tests */
		it('should return proper data if handle is empty', async () => {
			let invalidHandle = '';
			options.uri = signPath(`/contest/search/handle/${invalidHandle}`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
