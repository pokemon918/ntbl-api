const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkCreateStatusCode,
	checkStatusCodeByOptions,
	checkForSuccess,
	login,
	signPath,
	makeUniqueString,
	makeRandomInt,
	generateUserData,
} = require('../common.js');

describe('Tasting', () => {
	describe('create with info', () => {
		let options, path, baseData, tastingResponse, baseUserPath, user, userData;

		before(async () => {
			options = {...basePostOptions};
			baseUserPath = baseUrl + '/user';

			// Create user
			user = generateUserData();
			user.name = makeUniqueString();
			user.handle = makeUniqueString();
			userData = await createItem(baseUserPath, user);
			user.ref = userData.data.ref;

			// Simulate login for user
			await login(user.email, user.rawPass);

			path = signPath('/tasting', 'POST');
			baseData = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.5,
					maturity: 0.5,
				},
			};

			tastingResponse = await createItem(path, baseData);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			path = signPath('/tasting', 'POST');
			options.uri = signPath('/tasting', 'POST');
		});

		// base data tests

		it('should return correct status code', async () => {
			let response = await createItem(path, baseData, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should create actual info data in db', async () => {
			// Test tastingResponse first
			expect(tastingResponse).to.have.property('data');
			expect(tastingResponse.data).to.not.have.property('id');
			expect(tastingResponse.data.ref).to.be.a('string').that.have.lengthOf.above(0);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for individual data
			expect(tasting).to.have.property('info');
			expect(tasting.info).to.deep.equal(baseData.info);
		});

		it('should be successful', async () => {
			checkForSuccess(tastingResponse);
		});

		it('should be successful if info (payload) is an empty object', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			let response = await createItem(path, options.body, true);
			expect(response.statusCode).to.equal(201);
		});

		// base data tests

		it('should return an error if payload [info] is a string', async () => {
			options.body = {
				name: 'Test Tasting',
				info: makeUniqueString(),
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [info] is an array', async () => {
			options.body = {
				name: 'Test Tasting',
				info: ['shape', 'height'],
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload [info] is a number', async () => {
			options.body = {
				name: 'Test Tasting',
				info: makeRandomInt(),
			};

			await checkStatusCodeByOptions(options, 400);
		});

		/*
			Below, info/value is referred not as the payload , but the expected column destination
			in the impression_info table , to get a clearer view , please check the impression_info_type
			table , where info types are listed , and their expected rules / destination columns.
		*/

		// info tests

		it('should return an error if [info] is not a valid impression info type key', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			let invalidImpressionInfoType = makeUniqueString();
			options.body.info[invalidImpressionInfoType] = 'tall';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [info] is not a valid impression info value key', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
				},
			};

			options.body.info['shape'] = makeUniqueString();
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [info] is null', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['shape'] = null;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [value] is empty', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['shape'] = '';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [info] is a number', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['shape'] = makeRandomInt();
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [info] is an object', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['shape'] = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [info] is an array', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['shape'] = [];
			await checkStatusCodeByOptions(options, 400);
		});

		// value tests

		it('should return an error if [value] is null', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['height'] = null;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [value] is empty', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['height'] = '';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [value] is a string', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['height'] = makeUniqueString();
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [value] is an object', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['height'] = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [value] is an array', async () => {
			options.body = {
				name: 'Test Tasting',
				info: {},
			};

			options.body.info['height'] = [];
			await checkStatusCodeByOptions(options, 400);
		});

		// drinkability tests

		it('should be successful if [drinkability] data is valid', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.5,
					maturity: 0.5,
				},
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful even if [drinkability] is not present', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					maturity: 0.5,
				},
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should fail if [drinkability] data is greater than maximum value (1)', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 1.1,
					maturity: 0.5,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should fail if [drinkability] data is less than minimum value (0)', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: -0.9,
					maturity: 0.5,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [drinkability] is not a number', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 'abcd',
					maturity: 0.5,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [drinkability] has place value of tens', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 10,
					maturity: 0.5,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		// maturity tests

		it('should be successful if [maturity] data is valid', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.5,
					maturity: 0.5,
				},
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful even if [maturity] is not present', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.5,
				},
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should fail if [maturity] data is greater than maximum value (1)', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.5,
					maturity: 1.1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should fail if [maturity] data is less than minimum value (0)', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.5,
					maturity: -0.9,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [maturity] is not a number', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.5,
					maturity: 'abcd',
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [maturity] has place value of tens', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.5,
					maturity: 10,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		// todo: api/1963
		it.skip('should limit the [drinkability] decimal places to 9 if more than 9', async () => {
			let data = {
				name: 'Test Tasting',
				summary_wine: 'test summary wine',
				summary_personal: 'test summary personal',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.9999999999, //ten decimal places
					maturity: 0.5,
				},
			};

			let tastingResponse = await createItem(path, data);
			expect(tastingResponse.data.info.drinkability).to.equal(parseFloat(data.info.drinkability));
		});

		// todo: api/1963
		it.skip('should limit the [maturity] decimal places to 9 if more than 9', async () => {
			let data = {
				name: 'Test Tasting',
				info: {
					shape: 'tall',
					height: 3.5,
					drinkability: 0.5,
					maturity: 0.9999999999, //ten decimal places
				},
			};

			let tastingResponse = await createItem(path, data);
			expect(tastingResponse.data.maturity).to.equal(parseFloat(data.maturity));
		});
	});
});
