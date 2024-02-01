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

describe('User', () => {
	describe('deactivate', () => {
		let options,
			path,
			user,
			userData,
			userB,
			userBData,
			impressionData,
			impressionPath,
			impressionResponse,
			collectionData,
			collectionPath,
			collectionResponse,
			teamData,
			teamPath,
			teamResponse;

		before(async () => {
			options = {...basePostOptions};
			path = baseUrl + '/user';

			//User
			user = generateUserData();
			userData = await createItem(path, user, true);
			userB = generateUserData();
			userBData = await createItem(path, userB, true);
			await login(user.email, user.rawPass);

			//Impression
			impressionData = {name: 'test_name'};
			impressionPath = signPath('/tasting', 'POST');
			impressionResponse = await createItem(impressionPath, impressionData, true);

			//Team
			teamData = {
				handle: makeUniqueString(),
				name: makeUniqueString(),
				description: makeUniqueString(),
				visibility: 'public',
			};
			teamPath = signPath('/team', 'POST');
			teamResponse = await createItem(teamPath, teamData, true);

			//Another User as Team Admin
			await createItem(
				signPath(
					'/team/' + teamResponse.body.data.ref + '/user/' + userBData.body.data.ref,
					'POST'
				),
				{
					relation: ['admin'],
				},
				true
			);

			//Collection with Host Team
			collectionData = {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'open',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
				host: teamResponse.body.data.ref,
			};

			collectionPath = signPath('/event', 'POST');
			collectionResponse = await createItem(collectionPath, collectionData, true);
		});

		beforeEach(async () => {
			options.body = {};
			options.transform = null;
			options.method = 'POST';
		});

		it('should be successful deactivating an account', async () => {
			options.method = 'POST';
			options.uri = signPath('/user/deactivate', 'POST');

			let deactivateResponse = await request(options);
			expect(deactivateResponse.data).to.have.property('user_ref');
			expect(deactivateResponse.data.user_ref).to.be.a('string');
			expect(deactivateResponse.data.user_ref).to.equal(userData.body.data.ref);
		});

		it('should not be successful deactivating an already deactivated account', async () => {
			options.method = 'POST';
			options.uri = signPath('/user/deactivate', 'POST');
			await checkStatusCodeByOptions(options, 401);
		});

		//todo : should not be able to update a deactivated user (update user info not yet implemented)

		it('should not be able to change a deactivated users password', async () => {
			options.method = 'POST';
			options.uri = signPath('/user/access', 'POST');
			await checkStatusCodeByOptions(options, 401);
		});

		it('should not be able to reset a deactivated users password', async () => {
			options.method = 'POST';
			options.uri = baseUrl + '/user/access/reset';
			options.body = {
				email: user.email,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to query the deactivated user as himself', async () => {
			options.method = 'GET';
			options.uri = signPath('/myinfo', 'GET');
			await checkStatusCodeByOptions(options, 401);
		});

		it('should not be able to [collectively] query anything [impression] related to the deactivated user as himself', async () => {
			options.method = 'GET';
			options.uri = signPath('/tastings', 'GET');
			await checkStatusCodeByOptions(options, 401);
		});

		it('should not be able to [collectively] query anything [team] related to the deactivated user as himself', async () => {
			options.method = 'GET';
			options.uri = signPath('/my-teams', 'GET');
			await checkStatusCodeByOptions(options, 401);
		});

		it('should not be able to [collectively] query anything [collection] related to the deactivated user as himself', async () => {
			options.method = 'GET';
			options.uri = signPath('/events', 'GET');
			await checkStatusCodeByOptions(options, 401);
		});

		//*** Starting here , all queries are from another user's perspective ***
		it('should not be able to [singlely] query the deactivated user', async () => {
			await login(userB.email, userB.rawPass);

			options.method = 'GET';
			options.uri = signPath('/user/' + userData.body.data.ref);
			await checkStatusCodeByOptions(options, 400);
		});

		//todo : should not be able to collectively query deactivated users
		//defining collectively :
		//primarily from get /users/ listing (user list not yet implemented)
		//as a member of a team (team member list not yet implemented)
		//as a host of an event (user as a host not yet implemented)

		it('should not be able to [singlely] query anything [impression] related to the deactivated user', async () => {
			options.method = 'GET';
			options.uri = signPath('/tasting/' + impressionResponse.body.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to [singlely] query anything [team] related to the deactivated user', async () => {
			options.method = 'GET';
			options.uri = signPath('/team/' + teamResponse.body.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to [singlely] query anything [collection] related to the deactivated user', async () => {
			options.method = 'GET';
			options.uri = signPath('/event/' + collectionResponse.body.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to [collectively] query public [collection] related to the deactivated user as another user', async () => {
			await login(userB.email, userB.rawPass);
			options.method = 'GET';
			options.uri = signPath('/events', 'GET');
			let publicEvents = await request(options);

			/*
				1. Confirm that none of the returned public events has the ref of the event added by the deleted user
				2. Confirm that none of the returned public events has an owner_ref of the deleted user
			*/

			let eventRefFound = false;
			let deleteOwnerRefFound = false;

			publicEvents.forEach((event) => {
				if (event.ref == collectionResponse.body.data.ref) {
					deleteOwnerRefFound = true;
				}

				if (event.owner_ref == userData.body.data.ref) {
					deleteOwnerRefFound = true;
				}
			});

			expect(eventRefFound).to.equal(false);
			expect(deleteOwnerRefFound).to.equal(false);
		});

		it('should not be able to [collectively] query public [collection] by user ref related to the deactivated user as another user', async () => {
			await login(userB.email, userB.rawPass);
			options.method = 'GET';
			options.uri = signPath(`/${userData.body.data.ref}/events`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to update a [team] owned by the deactivated user as an another user that is a [team] [admin]', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(),
			};

			options.method = 'POST';
			options.uri = signPath('/team/' + teamResponse.body.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to update a [collection] owned by the deactivated user as an another user that is a [team] [admin] of a [host] [team]', async () => {
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(),
			};

			options.method = 'POST';
			options.uri = signPath('/event/' + collectionResponse.body.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
