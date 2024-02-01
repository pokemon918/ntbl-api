const expect = require('chai').expect;
const request = require('request-promise');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	makeIsoDateString,
	login,
	signPath,
	checkStatusCodeByOptions,
} = require('../common.js');

describe('Event', () => {
	describe('POST', () => {
		let options,
			path,
			user,
			userData,
			userB,
			userBData,
			impressionPath,
			impressionResponse,
			collections,
			collectionData,
			collectionPath,
			collectionResponse,
			teamPath,
			teamResponse,
			anotherCollectionResponse;

		before(async () => {
			options = {...basePostOptions};
			path = baseUrl + '/user';

			//Users
			user = generateUserData();
			userData = await createItem(path, user, true);
			userB = generateUserData();
			userBData = await createItem(path, userB, true);
			await login(user.email, user.rawPass);

			//Impression
			impressionPath = signPath('/tasting', 'POST');
			impressionResponse = await createItem(impressionPath, {name: makeUniqueString()});

			//Collections
			collectionPath = signPath('/event', 'POST');
			collectionData = [
				{
					name: makeUniqueString(),
					description: 'Event description',
					visibility: 'private',
					start_date: '2019-01-14 14:23:28',
					end_date: '2019-01-20 19:23:28',
				},
				{
					name: makeUniqueString(),
					description: 'Event description',
					visibility: 'private',
					start_date: '2019-01-14 14:23:28',
					end_date: '2019-01-20 19:23:28',
				},
				{
					name: makeUniqueString(),
					description: 'Event description',
					visibility: 'private',
					start_date: '2019-01-14 14:23:28',
					end_date: '2019-01-20 19:23:28',
				},
			];

			collections = [];
			for (let data of collectionData) {
				collectionPath = signPath('/event', 'POST');
				collectionResponse = await createItem(collectionPath, data);
				collections.push(collectionResponse.data);
			}

			//Solo Collection
			collectionPath = signPath('/event', 'POST');
			collectionResponse = await createItem(collectionPath, {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
			});

			//Team
			teamPath = signPath('/team', 'POST');
			teamResponse = await createItem(teamPath, {
				handle: makeUniqueString(),
				name: makeUniqueString(),
				description: makeUniqueString(),
				visibility: 'private',
			});

			//Collection from Another User
			await login(userB.email, userB.rawPass);
			collectionPath = signPath('/tasting', 'POST');
			anotherCollectionResponse = await createItem(collectionPath, {name: makeUniqueString()});

			//Login back to Original User
			await login(user.email, user.rawPass);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath('/event/delete', 'POST');
		});

		it('should be successful deleting single event', async () => {
			options.body = {
				event_refs: [collectionResponse.data.ref],
			};

			let deleteResponse = await request(options);

			expect(deleteResponse.data.event_refs).to.satisfy(function (deleted) {
				return deleted.includes(collectionResponse.data.ref);
			});
		});

		it('should be successful deleting multiple events', async () => {
			options.body = {
				event_refs: collections.map((collection) => {
					return collection.ref;
				}),
			};

			let deleteResponse = await request(options);
			for (let i = 0; i < collections.length; i++) {
				expect(deleteResponse.data.event_refs).to.satisfy(function (deleted) {
					return deleted.includes(collections[i].ref);
				});
			}
		});

		it('should not be successful deleting an already deleted event', async () => {
			options.body = {
				event_refs: collections.map((collection) => {
					return collection.ref;
				}),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be successful deleting events that are already deleted', async () => {
			options.body = {
				event_refs: [collectionResponse.data.ref],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to update a deleted tasting', async () => {
			options.body = {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
			};
			options.method = 'POST';
			options.uri = signPath('/event/' + collectionResponse.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add wines to a deleted tasting', async () => {
			options.body = {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
				wine_refs: [impressionResponse.data.ref],
			};
			options.method = 'POST';
			options.uri = signPath('/event/' + collectionResponse.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to delete wines from a deleted tasting', async () => {
			options.body = {
				wine_refs: [impressionResponse.data.ref],
			};
			options.method = 'POST';
			options.uri = signPath('/event/' + collectionResponse.data.ref + '/tastings', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to set a team host to a deleted event', async () => {
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

		// ***************************************************
		// ** todo : restore when admin types are available **
		// ***************************************************

		// it('should not be able to make a deleted event featured', async () => {
		// 	let featuredDatas = {};
		// 	featuredDatas['featured_events'] = [];

		// 	let feature_start = makeIsoDateString(0, 0, -1);
		// 	let feature_end = makeIsoDateString(0, 0, 1);

		// 	let featuredData = {
		// 		event_ref: collectionResponse.data.ref,
		// 		feature_start: feature_start,
		// 		feature_end: feature_end,
		// 	};

		// 	featuredDatas['featured_events'].push(featuredData);
		// 	options.body = featuredDatas;
		// 	options.uri = signPath('/events/featured', 'POST');
		// 	options.method = 'POST';
		// 	await checkStatusCodeByOptions(options, 400);
		// });

		it('should not be able to singlely query the deleted event', async () => {
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/event/' + collectionResponse.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to collectively query the deleted event', async () => {
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/events', 'GET');
			let collectiveCollectionResponse = await request(options);
			expect(collectiveCollectionResponse.data).to.equal(undefined);
		});

		it('should not be able to delete not owned events', async () => {
			options.body = {
				event_refs: [anotherCollectionResponse.data.ref],
			};

			await checkStatusCodeByOptions(options, 400);
		});
	});
});
