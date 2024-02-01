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
		checkProperData = (team) => {
			// Check for property existence
			expect(team).to.not.have.property('id');
			expect(team).to.have.property('name');
			expect(team).to.have.property('handle');
			expect(team).to.have.property('description');
			expect(team).to.have.property('visibility');
			expect(team).to.have.property('access');
			expect(team).to.have.property('avatar');

			// Check for correct data type
			expect(team.name).to.be.a('string');
			expect(team.handle).to.be.a('string');
			expect(team.description).to.be.a('string');
			expect(team.visibility).to.be.a('string');
			expect(team.access).to.be.a('string');
		};

		/****** Create users *******/

		let createUserPath = baseUrl + '/user';

		// Create team creator
		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		/****** Create Teams *******/

		// Simulate login the team creator
		await login(creator.email, creator.rawPass);

		// Generate data for teams
		let str1 = makeUniqueString();
		let str2 = makeUniqueString();
		let str3 = makeUniqueString();

		teamData = [
			{
				name: str1,
				description: 'team 1 description',
				visibility: 'public',
				access: 'apply',
				handle: str1,
			},
			{
				name: str2,
				description: 'team 2 description',
				visibility: 'public',
				access: 'apply',
				handle: str2,
			},
			{
				name: str3,
				description: 'team 3 description',
				visibility: 'hidden',
				access: 'apply',
				handle: str3,
			},
		];

		teams = [];

		// Create teams
		for (let data of teamData) {
			let response = await createItem(signPath('/team', 'POST'), data);
			teams.push(response.data);
		}
	});

	describe('get public teams', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath('/teams', 'GET');
		});

		/* Positive tests */
		it('should return correct success status code', async () => {
			console.log({options});

			await checkStatusCodeByOptions(options, 200);
		});

		it('should return all public teams', async () => {
			let teams = await request(options);

			// Since a team has been created above, it is expected that user1's teams is greater than 0
			expect(teams).to.have.lengthOf.above(0);
		});

		it('should return proper data for teams', async () => {
			let teams = await request(options);

			for (let i = 0; i < teams.length; i++) {
				checkProperData(teams[i]);
			}
		});
	});
});
