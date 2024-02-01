const expect = require('chai').expect;
const request = require('request-promise');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	login,
	signPath,
	checkStatusCodeByOptions,
} = require('../common.js');

describe('Team', () => {
	describe('POST', () => {
		let options,
			path,
			user,
			userData,
			userB,
			userBData,
			teams,
			teamData,
			teamPath,
			teamResponse,
			collectionPath,
			collectionResponse,
			anotherTeamResponse;

		before(async () => {
			options = {...basePostOptions};
			path = baseUrl + '/user';

			//Users
			user = generateUserData();
			userData = await createItem(path, user, true);
			userB = generateUserData();
			userBData = await createItem(path, userB, true);
			await login(user.email, user.rawPass);

			//Collection
			collectionPath = signPath('/event', 'POST');
			collectionResponse = await createItem(collectionPath, {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
			});

			//Team
			teamData = [
				{
					handle: makeUniqueString(),
					name: makeUniqueString(),
					description: makeUniqueString(),
					visibility: 'private',
				},
				{
					handle: makeUniqueString(),
					name: makeUniqueString(),
					description: makeUniqueString(),
					visibility: 'private',
				},
				{
					handle: makeUniqueString(),
					name: makeUniqueString(),
					description: makeUniqueString(),
					visibility: 'private',
				},
			];

			teams = [];
			for (let data of teamData) {
				teamPath = signPath('/team', 'POST');
				teamResponse = await createItem(teamPath, data);
				teams.push(teamResponse.data);
			}

			//Solo Team
			teamPath = signPath('/team', 'POST');
			teamResponse = await createItem(teamPath, {
				handle: makeUniqueString(),
				name: makeUniqueString(),
				description: makeUniqueString(),
				visibility: 'private',
			});

			//Team from Another User
			await login(userB.email, userB.rawPass);
			teamPath = signPath('/team', 'POST');
			anotherTeamResponse = await createItem(teamPath, {
				handle: makeUniqueString(),
				name: makeUniqueString(),
				description: makeUniqueString(),
				visibility: 'private',
			});

			//Login back to Original User
			await login(user.email, user.rawPass);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath('/team/delete', 'POST');
		});

		it('should be successful deleting single team', async () => {
			options.body = {
				team_refs: [teamResponse.data.ref],
			};

			let deleteResponse = await request(options);

			expect(deleteResponse.data.team_refs).to.satisfy(function (deleted) {
				return deleted.includes(teamResponse.data.ref);
			});
		});

		it('should be successful deleting multiple teams', async () => {
			options.body = {
				team_refs: teams.map((team) => {
					return team.ref;
				}),
			};

			let deleteResponse = await request(options);
			for (let i = 0; i < teams.length; i++) {
				expect(deleteResponse.data.team_refs).to.satisfy(function (deleted) {
					return deleted.includes(teams[i].ref);
				});
			}
		});

		it('should not be successful deleting an already deleted team', async () => {
			options.body = {
				team_refs: [teamResponse.data.ref],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be successful deleting teams that are already deleted', async () => {
			options.body = {
				team_refs: teams.map((team) => {
					return team.ref;
				}),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to update a deleted team', async () => {
			options.body = {
				name: makeUniqueString(),
				description: 'Team description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
			};
			options.method = 'POST';
			options.uri = signPath('/team/' + teamResponse.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to use a deleted team as an event host when [creating] an event', async () => {
			options.body = {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
				host: teamResponse.data.ref,
			};

			options.method = 'POST';
			options.uri = signPath('/event', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to use a deleted team as an event host when [updating] an event', async () => {
			options.body = {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
				host: teamResponse.data.ref,
			};

			options.method = 'POST';
			options.uri = signPath('/event/' + collectionResponse.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add relations to a deleted team', async () => {
			options.method = 'POST';
			options.body = {
				relation: ['member'],
			};

			options.uri = signPath(
				'/team/' + teamResponse.data.ref + '/user/' + userBData.body.data.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to delete relations from a deleted team', async () => {
			options.method = 'POST';
			options.body = {
				relation: ['member'],
			};

			options.uri = signPath(
				'/team/' + teamResponse.data.ref + '/user/' + userBData.body.data.ref + '/remove',
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to search for a deleted team', async () => {
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/my-teams/find/' + teamResponse.data.name, 'GET');
			let searchTeamResponse = await request(options);
			expect(searchTeamResponse.length).to.equal(0);
		});

		it('should not be able to singlely query the deleted team', async () => {
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/team/' + teamResponse.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to collectively query the deleted team', async () => {
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/my-teams', 'GET');
			let collectiveTeamResponse = await request(options);
			expect(collectiveTeamResponse.data).to.equal(undefined);
		});

		it('should not be able to delete not owned teams', async () => {
			options.body = {
				team_refs: [anotherTeamResponse.data.ref],
			};

			await checkStatusCodeByOptions(options, 400);
		});
	});
});
