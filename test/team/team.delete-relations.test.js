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
	likeOrFollowTeam,
} = require('../common.js');

describe('Team', () => {
	let options,
		removeItem,
		teamRef,
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
		deleteRelationPath,
		deleteRelation,
		checkRelationExistence;

	before(async () => {
		options = {...basePostOptions};
		removeItem = (list, itemToRemove) => {
			list.splice(list.indexOf(itemToRemove), 1);
		};

		/*
			Synopsis:
			- Create 3 users.
			- User1 will create a team
			- User2 will be "added" to the team by User1
			- User1 will pass ownership to User2
			- User3 can be "added" to the team by User1 or User2
		*/

		let createUserPath = baseUrl + '/user';

		// Create user1
		user1 = generateUserData();
		user1.handle = makeUniqueString();
		user1Data = await createItem(createUserPath, user1);

		// Create user2
		user2 = generateUserData();
		user2.handle = makeUniqueString();
		user2Data = await createItem(createUserPath, user2);

		// Create user3
		user3 = generateUserData();
		user3Data = await createItem(createUserPath, user3);

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
		teamRef = teamResponse.data.ref;

		/****** Create Relationships [admin, editor, member, follower, liker] *******/

		deleteRelationPath = `/team/${teamRef}/user`;

		deleteRelation = async (relation, userRef, statusCode) => {
			options.uri = signPath(deleteRelationPath + '/' + userRef + '/remove', 'POST');
			options.body = {
				relation: relation,
			};
			await checkStatusCodeByOptions(options, statusCode);
		};

		checkRelationExistence = async (relation, exists) => {
			let team = await getItem(signPath(`/team/${teamRef}`, 'GET'));

			if (team && team.userRelations.length > 0) {
				if (team.userRelations.includes(relation) == exists) {
					return true;
				}
				return false;
			} else {
				return false;
			}
		};
	});

	describe('Delete team relations', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = null;

			let addRelationPath = `/team/${teamResponse.data.ref}/user`;

			// Always re-login user1 by default to have the right access to the team
			await login(user1.email, user1.rawPass);

			// Make user1 an admin, editor and member of the team
			await createItem(signPath(addRelationPath + '/' + user1Data.data.ref, 'POST'), {
				relation: ['admin', 'editor', 'member'],
			});

			// Make user2 an admin, editor and member of the team
			await createItem(signPath(addRelationPath + '/' + user2Data.data.ref, 'POST'), {
				relation: ['admin', 'editor', 'member'],
			});

			// Make user2 an admin, editor and member of the team
			await createItem(signPath(addRelationPath + '/' + user3Data.data.ref, 'POST'), {
				relation: ['admin', 'editor', 'member'],
			});
		});

		/* Positive tests */
		it('should return correct success status code', async () => {
			await deleteRelation(['member'], user2Data.data.ref, 202);
		});

		it('should return correct success status code when using @teamHandle instead of team ref', async () => {
			options.uri = signPath(
				`/team/@${teamData.handle}/user` + '/' + user2Data.data.ref + '/remove',
				'POST'
			);
			options.body = {
				relation: ['member'],
			};
			await checkStatusCodeByOptions(options, 202);
		});

		it('should return correct success status code when using @userHandle instead of user ref', async () => {
			options.uri = signPath(`/team/${teamRef}/user` + '/@' + user2.handle + '/remove', 'POST');
			options.body = {
				relation: ['member'],
			};
			await checkStatusCodeByOptions(options, 202);
		});

		it('should return correct success status code when using both @teamHandle and @userHandle instead of team ref and user ref', async () => {
			options.uri = signPath(
				`/team/@${teamData.handle}/user` + '/@' + user2.handle + '/remove',
				'POST'
			);
			options.body = {
				relation: ['member'],
			};
			await checkStatusCodeByOptions(options, 202);
		});

		it('should remove admin relation', async () => {
			await deleteRelation(['admin'], user2Data.data.ref, 202);
		});

		it('should remove editor relation', async () => {
			await deleteRelation(['editor'], user2Data.data.ref, 202);
		});

		it('should remove member relation', async () => {
			await deleteRelation(['member'], user2Data.data.ref, 202);
		});

		it('should remove follow relation', async () => {
			let teamRelations = [];

			// Login user 2 and follow the team
			await login(user2.email, user2.rawPass);
			await likeOrFollowTeam('follow', teamRef);

			// Verify that follow has been added
			expect(await checkRelationExistence('follow', true)).to.equal(true);

			// Login user 1 again and delete the follow, user2 created
			await login(user1.email, user1.rawPass);
			await deleteRelation(['follow'], user2Data.data.ref, 202);

			// Login user 2 again and verify that follow had been deleted
			await login(user2.email, user2.rawPass);
			expect(await checkRelationExistence('follow', false)).to.equal(true);
		});

		it('should remove multiple valid-allowed relations', async () => {
			await deleteRelation(['admin', 'editor', 'member', 'follow'], user2Data.data.ref, 202);
		});

		/* Negative tests */
		it('should return an error if payload is empty', async () => {
			await deleteRelation(null, user1Data.data.ref, 400);
		});

		it('should not remove creator relation', async () => {
			await deleteRelation(['creator'], user1Data.data.ref, 400);
		});

		it('should not remove owner relation', async () => {
			await deleteRelation(['owner'], user1Data.data.ref, 400);
		});

		it('should not remove like relation', async () => {
			let teamRelations = [];

			// Login user 2 and like the team
			await login(user2.email, user2.rawPass);
			await likeOrFollowTeam('like', teamRef);

			// Verify that like has been added
			expect(await checkRelationExistence('like', true)).to.equal(true);

			// Login user 1 again and delete the like, user2 created and expect it to fail
			await login(user1.email, user1.rawPass);
			await deleteRelation(['like'], user2Data.data.ref, 400);

			// Login user 2 again and verify that like has not been deleted
			await login(user2.email, user2.rawPass);
			expect(await checkRelationExistence('like', true)).to.equal(true);
		});

		it('should fail when using an invalid team ref', async () => {
			options.uri = signPath(
				`/team/invalidTeamRef/user` + '/' + user2Data.data.ref + '/remove',
				'POST'
			);
			options.body = {
				relation: ['member'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail when using an invalid @teamHandle', async () => {
			options.uri = signPath(
				`/team/@invalidTeamHanlde!/user` + '/' + user2Data.data.ref + '/remove',
				'POST'
			);
			options.body = {
				relation: ['member'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail when using invalid user ref', async () => {
			options.uri = signPath(`/team/${teamRef}/user` + '/invaLid31!*UserRef' + '/remove', 'POST');
			options.body = {
				relation: ['member'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail when using invalid user handle', async () => {
			options.uri = signPath(
				`/team/${teamRef}/user` + '/@invaLid31!*UserHandle' + '/remove',
				'POST'
			);
			options.body = {
				relation: ['member'],
			};
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
