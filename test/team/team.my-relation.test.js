const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	getItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	makeRandomInt,
	login,
	signPath,
} = require('../common.js');

describe('Team', () => {
	let options,
		removeItem,
		teamData,
		basePath,
		checkProperData,
		user1,
		user2,
		user3,
		user1Data,
		user2Data,
		user3Data,
		teamResponse,
		updateMyTeamRelation,
		checkRelationExistence;

	before(async () => {
		options = {...basePostOptions};
		removeItem = (list, itemToRemove) => {
			list.splice(list.indexOf(itemToRemove), 1);
		};

		let createUserPath = baseUrl + '/user';

		// Create user1
		user1 = generateUserData();
		user1Data = await createItem(createUserPath, user1);

		// Create user2
		user2 = generateUserData();
		user2Data = await createItem(createUserPath, user2);

		// Simulate login for user 1, as he will be the initial owner of the team
		await login(user1.email, user1.rawPass);

		// Create a team. Initially owned by user1
		teamData = {
			name: makeUniqueString(),
			handle: makeUniqueString(),
			description: 'team description',
			public: true,
		};

		let createTeamPath = signPath('/team', 'POST');
		teamResponse = await createItem(createTeamPath, teamData);
		let teamRef = teamResponse.data.ref;

		/****** Create Relationships [admin, editor, member, follower, liker] *******/

		updateMyTeamRelation = async (action) => {
			const options = {
				method: 'POST',
				json: true,
				uri: signPath(`/team/${teamRef}`, 'POST'),
				body: {
					relation: [action],
				},
				transform: (body, response, resolveWithFullResponse) => {
					return response;
				},
			};

			let statusCode = 0;

			await request(options)
				.then((response) => {
					statusCode = response.statusCode;
				})
				.catch((err) => (statusCode = err.statusCode));

			return statusCode;
		};

		checkRelationExistence = async (relation, exists) => {
			let team = await getItem(signPath(`/team/${teamRef}`, 'GET'));
			expect(team.userRelations.includes(relation)).to.equal(exists);
		};
	});

	describe('Update my team relation', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = null;

			// Always re-login user1 by default to have the right access to the team
			await login(user1.email, user1.rawPass);
		});

		it('should be able to like a team', async () => {
			let statusCode = await updateMyTeamRelation('like');
			expect(statusCode).to.equal(200);
			checkRelationExistence('like', true);
		});

		it('should be able to follow a team', async () => {
			let statusCode = await updateMyTeamRelation('follow');
			expect(statusCode).to.equal(200);
			checkRelationExistence('follow', true);
		});

		it('should be able to join a team', async () => {
			let statusCode = await updateMyTeamRelation('member');
			expect(statusCode).to.equal(200);
			checkRelationExistence('member', true);
		});

		// Negative tests
		it('should not be able to be an creator of the team', async () => {
			let statusCode = await updateMyTeamRelation('creator');
			expect(statusCode).to.equal(400);
		});

		it('should not be able to be an admin of the team', async () => {
			let statusCode = await updateMyTeamRelation('admin');
			expect(statusCode).to.equal(400);
		});

		it('should not be able to be an owner of the team', async () => {
			let statusCode = await updateMyTeamRelation('owner');
			expect(statusCode).to.equal(400);
		});

		it('should not be able to be an editor of the team', async () => {
			let statusCode = await updateMyTeamRelation('editor');
			expect(statusCode).to.equal(400);
		});
	});
});
