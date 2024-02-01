const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	getItem,
	checkCreateStatusCode,
	checkForSuccess,
	login,
	signPath,
	makeUniqueString,
	generateUserData,
} = require('../common.js');

describe('Tasting', () => {
	describe('create with rating', () => {
		let options,
			path,
			baseData,
			tastingResponse,
			checkProperRatingData,
			getRawBasePath,
			baseUserPath,
			user,
			userData;

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
			getRawBasePath = '/raw/impression/';

			baseData = {
				name: 'test_name',
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			tastingResponse = await createItem(path, baseData);

			checkProperRatingData = (tasting) => {
				expect(tasting).to.not.have.property('id');
				expect(tasting).to.have.property('rating');
				expect(tasting.rating.impression_id).to.be.a('number');
				expect(tasting.rating.version).to.equal('1.0.0.0');
				expect(parseFloat(tasting.rating.final_points).toFixed(9)).to.equal(
					parseFloat(88).toFixed(9)
				);
				expect(parseFloat(tasting.rating.balance).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
				expect(parseFloat(tasting.rating.length).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
				expect(parseFloat(tasting.rating.intensity).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
				expect(parseFloat(tasting.rating.terroir).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
				expect(parseFloat(tasting.rating.complexity).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			path = signPath('/tasting', 'POST');
		});

		it('should return correct status code', async () => {
			let response = await createItem(path, baseData, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful', async () => {
			checkForSuccess(tastingResponse);
		});

		it('should create actual rating data in db', async () => {
			// Test tastingResponse first
			expect(tastingResponse).to.have.property('data');
			expect(tastingResponse.data.ref).to.be.a('string').that.have.lengthOf.above(0);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for rating data
			checkProperRatingData(tasting);
		});

		it('should be successful if rating is not present', async () => {
			let data = {
				name: 'test_name',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful even if quality and drinkability is present', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 'a'.repeat(16 - 1),
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
					quality: 1,
					drinkability: 1,
				},
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if rating version is equal to max(255)-1 chars', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 'a'.repeat(16 - 1),
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if rating version is equal to max(255) chars', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 'a'.repeat(16),
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if rating version exceed max(16) chars', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 'a'.repeat(16 + 1),
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating version is missing', async () => {
			let data = {
				name: 'test_name',
				rating: {
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating version has html <>', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: '<p>version!</p>',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating version has non printable chars', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: '1.\r0.\n0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating final_points is missing', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 1,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating balance is missing', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating length is missing', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					balance: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating intensity is missing', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					balance: 1,
					length: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating terroir is missing', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating complexity is missing', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating final_points not a number', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 'a',
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating balance not a number', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 'a',
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating length not a number', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 1,
					length: 'a',
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating intensity not a number', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 'a',
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating terroir not a number', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 'a',
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating complexity not a number', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 'a',
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating final_points is less than min(0) value', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: -1,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating final_points is greater than 100', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100 + 1,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating balance is less than min(0) value', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: -1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating balance has place value of tens', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 10,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should limit the rating balance decimal places to 9 if more than 9', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 0.0000002119, //ten decimal places
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
			let rawTastingData = await getItem(
				signPath(getRawBasePath + tastingResponse.data.ref, 'GET')
			);
			expect(rawTastingData.rating.balance).to.equal(parseFloat(data.rating.balance).toFixed(9));
		});

		it('should be successful if balance has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 0.999999999, //9 decimal places
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if rating length is less than min(0) value', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: -1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating length has place value of tens', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 10,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should limit the rating length decimal places to 9 if more than 9', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 0.9999999999, //ten decimal places
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
			let rawTastingData = await getItem(
				signPath(getRawBasePath + tastingResponse.data.ref, 'GET')
			);
			expect(rawTastingData.rating.balance).to.equal(parseFloat(data.rating.balance).toFixed(9));
		});

		it('should be successful if length has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 0.999999999, //9 decimal places
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if rating intensity is less than min(0) value', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: -1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating intensity has place value of tens', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 10,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should limit the rating intensity decimal places to 9 if more than 9', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 0.9999999999, //ten decimal places
					terroir: 1,
					complexity: 1,
				},
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
			let rawTastingData = await getItem(
				signPath(getRawBasePath + tastingResponse.data.ref, 'GET')
			);
			expect(rawTastingData.rating.balance).to.equal(parseFloat(data.rating.balance).toFixed(9));
		});

		it('should be successful if intensity has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 0.999999999, //9 decimal places
					terroir: 1,
					complexity: 1,
				},
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if rating terroir is less than min(0) value', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: -1,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating terroir has place value of tens', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 10,
					complexity: 1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should limit the rating terroir decimal places to 9 if more than 9', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 0.9999999999, //ten decimal places
					complexity: 1,
				},
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
			let rawTastingData = await getItem(
				signPath(getRawBasePath + tastingResponse.data.ref, 'GET')
			);
			expect(rawTastingData.rating.balance).to.equal(parseFloat(data.rating.balance).toFixed(9));
		});

		it('should be successful if terroir has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 0.999999999, //9 decimal places
					complexity: 1,
				},
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if rating complexity is less than min(0) value', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: -1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating complexity has place value of tens', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 10,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should limit the rating complexity decimal places to 9 if more than 9', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 0.9999999999, //ten decimal places
				},
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
			let rawTastingData = await getItem(
				signPath(getRawBasePath + tastingResponse.data.ref, 'GET')
			);
			expect(rawTastingData.rating.balance).to.equal(parseFloat(data.rating.balance).toFixed(9));
		});

		it('should be successful if complexity has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			let data = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 0.999999999, //9 decimal places
				},
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return error if final_points have string values', async () => {
			let data = JSON.parse(JSON.stringify(baseData));
			data.rating.final_points = '00088';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return error if balance have string values', async () => {
			let data = JSON.parse(JSON.stringify(baseData));
			data.rating.balance = '000.4';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return error if length have string values', async () => {
			let data = JSON.parse(JSON.stringify(baseData));
			data.rating.length = '0001';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return error if intensity have string values', async () => {
			let data = JSON.parse(JSON.stringify(baseData));
			data.rating.intensity = '01';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return error if terroir have string values', async () => {
			let data = JSON.parse(JSON.stringify(baseData));
			data.rating.terroir = '0.4';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return error if complexity have string values', async () => {
			let data = JSON.parse(JSON.stringify(baseData));
			data.rating.complexity = '00.9999';
			await checkCreateStatusCode(path, data, 400);
		});
	});
});
