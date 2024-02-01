const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	createItem,
	getItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	makeRandomInt,
	login,
	signPath,
	likeOrFollowTeam,
} = require('../common.js');

describe('Team', () => {
	let options,
		teams,
		teamData,
		checkProperData,
		matchUser2Team,
		user,
		user2,
		userData,
		user2Data,
		teamExactHandle,
		teamExactName,
		teamStartsWithHandle,
		teamStartsWithName,
		teamIncludesHandle,
		teamIncludesName,
		teamHidden,
		teamIncludesHiddenKeyword,
		teamSurpasessLimit,
		keyword,
		hiddenKeyword;

	before(async () => {
		options = {...baseGetOptions};
		/****** Create users *******/
		let createUserPath = baseUrl + '/user';

		// Create team creators
		user = generateUserData();
		userData = await createItem(createUserPath, user);

		user2 = generateUserData();
		user2Data = await createItem(createUserPath, user2);

		/****** Create Teams *******/

		// Simulate login the team user
		await login(user.email, user.rawPass);
		keyword = makeUniqueString();

		// Generate a data for team 1 and team 2
		teamExactHandle = {
			handle: keyword,
			name: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'public',
		};

		teamExactName = {
			handle: makeUniqueString(),
			name: keyword,
			description: makeUniqueString(),
			visibility: 'public',
		};

		teamStartsWithHandle = {
			handle: keyword + makeUniqueString(),
			name: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'public',
		};

		teamStartsWithName = {
			handle: makeUniqueString(),
			name: keyword + makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'public',
		};

		teamIncludesHandle = {
			handle: makeUniqueString(2) + keyword + makeUniqueString(2),
			name: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'public',
		};

		teamIncludesName = {
			handle: makeUniqueString(),
			name: makeUniqueString(2) + keyword + makeUniqueString(2),
			description: makeUniqueString(),
			visibility: 'public',
		};

		hiddenKeyword = 'hidden' + makeUniqueString();

		teamHidden = {
			handle: hiddenKeyword,
			name: makeUniqueString(2) + hiddenKeyword + makeUniqueString(2),
			description: makeUniqueString(),
			visibility: 'hidden',
		};

		teamIncludesHiddenKeyword = {
			handle: makeUniqueString(),
			name: makeUniqueString(2) + hiddenKeyword + makeUniqueString(2),
			description: makeUniqueString(),
			visibility: 'public',
		};

		let createTeamPath = '/team';
		let createTeamMethod = 'POST';
		await createItem(signPath(createTeamPath, createTeamMethod), teamExactHandle);
		await createItem(signPath(createTeamPath, createTeamMethod), teamExactName);
		await createItem(signPath(createTeamPath, createTeamMethod), teamStartsWithHandle);
		await createItem(signPath(createTeamPath, createTeamMethod), teamStartsWithName);
		await createItem(signPath(createTeamPath, createTeamMethod), teamIncludesHandle);
		await createItem(signPath(createTeamPath, createTeamMethod), teamIncludesName);
		await createItem(signPath(createTeamPath, createTeamMethod), teamHidden);
		await createItem(signPath(createTeamPath, createTeamMethod), teamIncludesHiddenKeyword);

		options.uri = signPath(`/teams/find/${keyword}`, 'GET');

		checkProperData = (team, baseTeam) => {
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
			expect(team.visibility).to.equal(baseTeam.visibility);
		};

		matchUser2Team = async (accessType) => {
			await login(user2.email, user2.rawPass);

			let user2PublicTeam = {
				handle: makeUniqueString(2) + keyword + makeUniqueString(2),
				name: makeUniqueString(),
				description: makeUniqueString(),
				visibility: accessType,
			};

			let createTeamPath = '/team';
			let createTeamMethod = 'POST';
			let createResponse = await createItem(signPath('/team', 'POST'), user2PublicTeam);

			await login(user.email, user.rawPass);

			let teams = await request(options);
			let matchFound = false;

			for (let i = 0; i < teams.length; i++) {
				if (teams[i].handle == user2PublicTeam.handle) matchFound = true;
			}

			return matchFound;
		};
	});

	describe('find teams', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath(`/teams/find/${keyword}`, 'GET');
			// login user1 by default
			await login(user.email, user.rawPass);
		});

		/* Positive tests */
		it('should return correct success status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have the correct order of priority/heirarchy', async () => {
			/*
				Search results must be returned in the order of these priorities...
					1. If handle is exact match with string (teamExactHandle)
					2. If name is exact match with string (teamExactName)
					3. If handle starts with string (teamStartsWithHandle)
					4. if name starts with string (teamStartsWithName)
					5. if handle includes string (teamIncludesHandle)
					6. if name includes string (teamIncludesName)
			*/

			console.log({options});
			let teams = await request(options);

			checkProperData(teams[0], teamExactHandle);
			checkProperData(teams[1], teamExactName);
			checkProperData(teams[2], teamStartsWithHandle);
			checkProperData(teams[3], teamStartsWithName);
			checkProperData(teams[4], teamIncludesHandle);
			checkProperData(teams[5], teamIncludesName);
		});

		it('should be able to find teams created by other people that are public', async () => {
			let matchFound = await matchUser2Team('public');
			expect(matchFound).to.equal(true);
		});

		it('should NOT be able to find teams created by other people that are NOT public', async () => {
			let matchFound = await matchUser2Team('hidden');
			expect(matchFound).to.equal(false);
		});

		it('should be able to find teams created by other people that are NOT public when exact handle matches', async () => {
			options.uri = signPath(`/teams/find/${hiddenKeyword}`, 'GET');
			let teams = await request(options);

			// Hidden Results First
			checkProperData(teams[0], teamHidden);

			// And any open teams that adhere to core-252's mechanics
			checkProperData(teams[1], teamIncludesHiddenKeyword);
		});

		it('should limit the results to a maximum of 10 records', async () => {
			let maxReturnSize = 10;
			let maxKeyword = 'maximum' + makeUniqueString();

			// Create teams that surpasses the limit
			teamSurpasessLimit = [];
			for (let i = 0; i <= maxReturnSize; i++) {
				let identifier = maxKeyword + makeUniqueString(2) + i;

				teamSurpasessLimit.push({
					handle: identifier,
					name: identifier,
					description: makeUniqueString(),
					visibility: 'public',
				});

				let createTeamPath = '/team';
				let createTeamMethod = 'POST';
				let createResponse = await createItem(
					signPath(createTeamPath, createTeamMethod),
					teamSurpasessLimit[i]
				);
			}

			// Search for the created teams
			options.method = 'GET';
			options.uri = signPath(`/teams/find/${maxKeyword}`, 'GET');
			let teams = await request(options);

			// Expect the results to be limited
			expect(teams.length).to.equal(maxReturnSize);
			expect(teams.length).to.not.equal(teamSurpasessLimit.length);

			// Check Data
			for (let i = 0; i <= teams.length - 1; i++) {
				expect(teams[i].name.includes(maxKeyword)).to.equal(true);
				expect(teams[i].handle.includes(maxKeyword)).to.equal(true);
			}
		});

		/* Negative tests */
		it('should return error if keyword exceeds max length of 128', async () => {
			let keyword = makeUniqueString(129);
			options.uri = signPath(`/teams/find/${keyword}`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
