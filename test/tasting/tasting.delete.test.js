const expect = require('chai').expect;
const request = require('request-promise');
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
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

describe('Tasting', () => {
	describe('POST', () => {
		let options,
			path,
			user,
			userData,
			userB,
			userBData,
			collectionPath,
			collectionResponse,
			impressionData,
			impressionPath,
			impressionResponse,
			impressions,
			impressionSingle,
			impressionNotOwned,
			impressionOnCollection;

		before(async () => {
			options = {...basePostOptions};
			path = baseUrl + '/user';

			//Users
			user = generateUserData();
			userData = await createItem(path, user, true);
			userB = generateUserData();
			userBData = await createItem(path, userB, true);
			await login(user.email, user.rawPass);

			//Impressions
			impressionData = [
				{name: makeUniqueString()},
				{name: makeUniqueString()},
				{name: makeUniqueString()},
			];

			impressions = [];
			for (let data of impressionData) {
				impressionPath = signPath('/tasting', 'POST');
				impressionResponse = await createItem(impressionPath, data);
				impressions.push(impressionResponse.data);
			}

			// Single Impression
			impressionPath = signPath('/tasting', 'POST');
			impressionSingle = await createItem(impressionPath, {name: makeUniqueString()});

			// Impression to be linked on a Collection
			impressionPath = signPath('/tasting', 'POST');
			impressionOnCollection = await createItem(impressionPath, {name: makeUniqueString()});

			// Collection
			collectionPath = signPath('/event', 'POST');
			collectionResponse = await createItem(collectionPath, {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
				wine_refs: [impressionOnCollection.data.ref],
			});

			// Impression from Another User
			await login(userB.email, userB.rawPass);
			impressionPath = signPath('/tasting', 'POST');
			impressionNotOwned = await createItem(impressionPath, {name: makeUniqueString()});

			// Login back to Original User
			await login(user.email, user.rawPass);
		});

		beforeEach(async () => {
			options.transform = null;
			options.formData = null;
			options.method = 'POST';
			options.uri = signPath('/tasting/delete', 'POST');
		});

		it('should be successful deleting single tasting', async () => {
			options.body = {
				wine_refs: [impressionSingle.data.ref],
			};

			let deleteResponse = await request(options);
			expect(deleteResponse.data.tasting_refs).to.satisfy(function (deleted) {
				return deleted.includes(impressionSingle.data.ref);
			});
		});

		it('should be successful deleting multiple tastings', async () => {
			options.body = {
				wine_refs: impressions.map((impression) => {
					return impression.ref;
				}),
			};

			let deleteResponse = await request(options);
			for (let i = 0; i < impressions.length; i++) {
				expect(deleteResponse.data.tasting_refs).to.satisfy(function (deleted) {
					return deleted.includes(impressions[i].ref);
				});
			}
		});

		/*
		|--------------------------------------------------------------------------
		| Negative tests
		|--------------------------------------------------------------------------
		*/

		it('should return an error if payload if empty', async () => {
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if wine_refs if empty', async () => {
			options.body = {
				wine_refs: null,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if wine_refs is not an array [string]', async () => {
			options.body = {
				wine_refs: 'string',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if wine_refs is not an array [int]', async () => {
			options.body = {
				wine_refs: 1234,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if wine_refs is not an array [object]', async () => {
			options.body = {
				wine_refs: {},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be successful deleting tastings that are already deleted', async () => {
			options.body = {
				wine_refs: impressions.map((impression) => {
					return impression.ref;
				}),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to update a deleted tasting', async () => {
			options.method = 'POST';
			options.uri = signPath('/tasting/' + impressionResponse.data.ref, 'POST');

			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to add a deleted tasting to an event', async () => {
			options.method = 'POST';
			options.uri = signPath('/event', 'POST');
			options.body = {
				name: makeUniqueString(),
				description: 'Event description',
				visibility: 'private',
				start_date: '2019-01-14 14:23:28',
				end_date: '2019-01-20 19:23:28',
				wine_refs: impressions.map((impression) => {
					return impression.ref;
				}),
			};

			let collectionResponse = await request(options);
			expect(collectionResponse.data.tastings.length).to.equal(0);
		});

		it('should not be able to add an image to a deleted tasting', async () => {
			var filePath = np.join(__dirname, './assets/valid/wine.jpg');
			var fileName = np.basename(filePath);
			var type = mime.contentType(fileName);
			var file = fs.createReadStream(filePath);

			delete options.body;
			options.formData = {
				uploadedFile: {
					value: file,
					options: {
						filename: fileName,
						contentType: type,
					},
				},
			};

			options.method = 'POST';
			options.uri = signPath('/tasting/addImage/' + impressionResponse.data.ref, 'POST');

			let error = {};
			await request
				.post(options)
				.catch((err) => {
					error = err;
				})
				.finally(() => {
					//Because an empty file will also result in 400 error
					expect(error.message).to.include(impressionResponse.data.ref);
					expect(error.message).to.include('does not exist');
					expect(error.statusCode).to.equal(400);
				});
		});

		it('should no longer be a wine on an event', async () => {
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/event/' + collectionResponse.data.ref, 'GET');
			let impressionCollectionResponse = await request(options);

			expect(impressionCollectionResponse.tastings).to.satisfy(function (tastings) {
				return !tastings.includes(impressionResponse.data.ref);
			});
		});

		it('should not be able to singlely query the deleted tasting', async () => {
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/tasting/' + impressionResponse.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to collectively query the deleted tasting', async () => {
			options.body = {};
			options.method = 'GET';
			options.uri = signPath('/tastings', 'GET');
			let collectiveImpressionResponse = await request(options);
			expect(collectiveImpressionResponse.data).to.equal(undefined);
		});

		it('should not be able to delete not owned tastings', async () => {
			options.body = {
				wine_refs: [impressionNotOwned.data.ref],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to delete non-existing tastings', async () => {
			let nonExistingRefs = [];
			nonExistingRefs.push(makeUniqueString());
			options.body = {
				wine_refs: nonExistingRefs,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to delete tastings that are part of an event', async () => {
			options.body = {
				wine_refs: [impressionOnCollection.data.ref],
			};

			await checkStatusCodeByOptions(options, 400);
		});
	});
});
