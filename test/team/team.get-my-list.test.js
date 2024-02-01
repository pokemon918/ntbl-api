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
		creator,
		admin,
		editor,
		member,
		follower,
		liker,
		notRelatedUser,
		creatorData,
		adminData,
		editorData,
		memberData,
		followerData,
		likerData,
		notRelatedUserData,
		checkRelationExistence;

	before(async () => {
		options = {...baseGetOptions};
		checkProperData = (team, baseData) => {
			// Check for property existence
			expect(team).to.not.have.property('id');
			expect(team).to.have.property('name');
			expect(team).to.have.property('handle');
			expect(team).to.have.property('description');
			expect(team).to.have.property('visibility');
			expect(team).to.have.property('access');
			expect(team).to.have.property('avatar');
			expect(team).to.have.property('membersCount');

			// Check for correct data type
			expect(team.name).to.be.a('string');
			expect(team.handle).to.be.a('string');
			expect(team.description).to.be.a('string');
			expect(team.visibility).to.be.a('string');
			expect(team.access).to.be.a('string');
			expect(team.membersCount).to.be.a('number');

			// Check for value
			expect(team.name).to.equal(baseData.name);
			expect(team.handle).to.equal(baseData.handle.toLowerCase());
			expect(team.description).to.equal(baseData.description);
			expect(team.visibility).to.equal(baseData.visibility);
			expect(team.access).to.equal(baseData.access);
		};

		/*
			Synopsis:
			- Create different types of users, creator|admin|editor|member|follower|notrelated
			- Creator will create a team
			- Creator will add admin, editor, member and follower users to the team with their corresponding relation			
		*/

		/****** Create users *******/

		let createUserPath = baseUrl + '/user';

		// Create team creator
		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		// Create team admin
		admin = generateUserData();
		adminData = await createItem(createUserPath, admin);

		// Create team editor
		editor = generateUserData();
		editorData = await createItem(createUserPath, editor);

		// Create team member
		member = generateUserData();
		memberData = await createItem(createUserPath, member);

		// Create team follower
		follower = generateUserData();
		followerData = await createItem(createUserPath, follower);

		// Create team like
		liker = generateUserData();
		likerData = await createItem(createUserPath, liker);

		// Create a user that is not related to the team in any way
		notRelatedUser = generateUserData();
		notRelatedUserData = await createItem(createUserPath, notRelatedUser);

		/****** Create Teams *******/

		// Simulate login the team creator
		await login(creator.email, creator.rawPass);

		// Generate a data for team 1 and team 2
		let str1 = makeUniqueString();
		let str2 = makeUniqueString();

		teamData = [
			{
				name: str1,
				description: 'team 1 description',
				visibility: 'private',
				access: 'apply',
				handle: str1,
			},
			{
				name: str2,
				description: 'team 2 description',
				visibility: 'private',
				access: 'apply',
				handle: str2,
			},
		];

		teams = [];

		// Create teams
		for (let data of teamData) {
			let response = await createItem(signPath('/team', 'POST'), data);
			teams.push(response.data);
		}

		/****** Create Relationships [admin, editor, member, follower, liker] *******/

		let addRelationPath = `/team/${teams[0].ref}/user`;

		// Add admin to team1
		await createItem(signPath(addRelationPath + '/' + adminData.data.ref, 'POST'), {
			relation: ['admin'],
		});

		// Add editor to team1
		await createItem(signPath(addRelationPath + '/' + editorData.data.ref, 'POST'), {
			relation: ['editor'],
		});

		// Add member to team1
		await createItem(signPath(addRelationPath + '/' + memberData.data.ref, 'POST'), {
			relation: ['member'],
		});

		checkRelationExistence = async (relation, exists) => {
			let team = await getItem(signPath(`/team/${teams[0].ref}`, 'GET'));
			expect(team.userRelations.includes(relation)).to.equal(exists);
		};
	});

	describe('get teams', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath('/my-teams', 'GET');
		});

		/* Positive tests */
		it('should return correct success status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return teams related to the user', async () => {
			let teams = await request(options);

			// Since a team has been created above, it is expected that user1's teams is greater than 0
			expect(teams).to.have.lengthOf.above(0);
		});

		it('should return proper data for teams', async () => {
			let teams = await request(options);

			for (let i = 0; i < teams.length; i++) {
				checkProperData(teams[i], teamData[i]);
			}
		});

		it('should return teams to admins', async () => {
			// Simulate login the team admin
			await login(admin.email, admin.rawPass);
			options.uri = signPath('/my-teams', 'GET');

			let teams = await request(options);

			// Since a team has been created above, it is expected that user1's teams is greater than 0
			expect(teams).to.have.lengthOf.above(0);
		});

		it('should return teams to contibs', async () => {
			// Simulate login the team editor
			await login(editor.email, editor.rawPass);
			options.uri = signPath('/my-teams', 'GET');

			let teams = await request(options);

			// Since a team has been created above, it is expected that user1's teams is greater than 0
			expect(teams).to.have.lengthOf.above(0);
		});

		it('should return teams to members', async () => {
			// Simulate login the team member
			await login(member.email, member.rawPass);
			options.uri = signPath('/my-teams', 'GET');

			let teams = await request(options);

			// Since a team has been created above, it is expected that user1's teams is greater than 0
			expect(teams).to.have.lengthOf.above(0);
		});

		it('should return teams to follower', async () => {
			// login follower and follow the team
			await login(follower.email, follower.rawPass);
			await likeOrFollowTeam('follow', teams[0].ref);
			checkRelationExistence('follow', true);

			options.uri = signPath('/my-teams', 'GET');
			let response = await request(options);
			expect(response).to.have.lengthOf.above(0);
		});

		it("should have the correct number of members for each of the user's team", async () => {
			/*
				Summary: 
				- Create two teams.
				- Add 2 teams to the first team
				- Add 3 teams to the second team
				- Tests the membersCount and make sure they have the correct number
			*/

			// Create 5 users for testing
			let createUserPath = baseUrl + '/user';
			const userA = generateUserData();
			const userAData = await createItem(createUserPath, userA);

			const userB = generateUserData();
			const userBData = await createItem(createUserPath, userB);

			const userC = generateUserData();
			const userCData = await createItem(createUserPath, userC);

			const userD = generateUserData();
			const userDData = await createItem(createUserPath, userD);

			const userE = generateUserData();
			const userEData = await createItem(createUserPath, userE);

			const userF = generateUserData();
			const userFData = await createItem(createUserPath, userF);

			// Login userA to make it the creator/admin of the teams to be created
			await login(userA.email, userA.rawPass);

			// Create the teams
			let userATeamData = [
				{
					name: 'Team A',
					description: 'Team A description',
					visibility: 'private',
					handle: makeUniqueString(),
				},
				{
					name: 'Team B',
					description: 'Team B description',
					visibility: 'private',
					handle: makeUniqueString(),
				},
			];

			let teams = [];

			for (let data of userATeamData) {
				let response = await createItem(signPath('/team', 'POST'), data);
				teams.push(response.data);
			}

			// Set relation path for teamA
			let addRelationPath = `/team/${teams[0].ref}/user`;

			// Add userB to teamA
			await createItem(signPath(addRelationPath + '/' + userBData.data.ref, 'POST'), {
				relation: ['member'],
			});

			// Add userC to teamA
			await createItem(signPath(addRelationPath + '/' + userCData.data.ref, 'POST'), {
				relation: ['member'],
			});

			// Set relation path for teamB
			addRelationPath = `/team/${teams[1].ref}/user`;

			// Add userD to teamB
			await createItem(signPath(addRelationPath + '/' + userDData.data.ref, 'POST'), {
				relation: ['member'],
			});

			// Add userE to teamB
			await createItem(signPath(addRelationPath + '/' + userEData.data.ref, 'POST'), {
				relation: ['member'],
			});

			// Add userF to teamB
			await createItem(signPath(addRelationPath + '/' + userFData.data.ref, 'POST'), {
				relation: ['member'],
			});

			// Fetch my-teams for userA
			options.uri = signPath('/my-teams', 'GET');
			let myTeams = await request(options);
			let teamA = myTeams[0];
			let teamB = myTeams[1];

			// userA should have two teams, teamA and teamB
			expect(myTeams.length).to.equal(2);

			// teamA should have 3 members (teamA, teamB, teamC)
			expect(teamA.membersCount).to.equal(3);

			// teamB should have 4 members (teamA, teamD, teamE, teamF)
			expect(teamB.membersCount).to.equal(4);
		});

		/* NEGATIVE TESTS */

		it('should not return teams to liker', async () => {
			// login liker and like the team
			await login(liker.email, liker.rawPass);
			await likeOrFollowTeam('like', teams[0].ref);

			options.uri = signPath('/my-teams', 'GET');
			let response = await request(options);
			expect(response).to.have.lengthOf(0);
		});

		it('should not return teams to users that are not related to the team', async () => {
			// Simulate login the team notRelatedUser
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			options.uri = signPath('/my-teams', 'GET');

			let teams = await request(options);
			expect(teams).to.have.lengthOf(0);
		});
	});
});
