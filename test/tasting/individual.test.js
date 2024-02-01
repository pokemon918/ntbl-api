const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkCreateStatusCode,
	checkForSuccess,
	login,
	signPath,
	makeUniqueString,
	generateUserData,
} = require('../common.js');

describe('Tasting', () => {
	describe('create with individual', () => {
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
				summary_wine: 'test summary wine',
				summary_personal: 'test summary personal',
				food_pairing: 'test food pairing',
				location: 'copenhagen',
				gps: {
					lat: 90,
					long: 180,
				},
			};
			tastingResponse = await createItem(path, baseData);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			path = signPath('/tasting', 'POST');
		});

		// base data tests

		it('should return correct status code', async () => {
			let response = await createItem(path, baseData, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful', async () => {
			checkForSuccess(tastingResponse);
		});

		it('should create actual individual data in db', async () => {
			// Test tastingResponse first
			expect(tastingResponse).to.have.property('data');
			expect(tastingResponse.data).to.not.have.property('id');
			expect(tastingResponse.data.ref).to.be.a('string').that.have.lengthOf.above(0);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for individual data
			expect(tasting).to.have.property('individual');
			expect(tasting.individual.impression_id).to.be.a('number');
			expect(tasting.individual.summary_wine).to.equal(baseData.summary_wine);
			expect(tasting.individual.summary_personal).to.equal(baseData.summary_personal);
			expect(tasting.individual.food_pairing).to.equal(baseData.food_pairing);
			expect(tasting.individual.location).to.equal(baseData.location);
			expect(tasting.individual.lat).to.equal(baseData.gps.lat + '.0000000000000');
			expect(tasting.individual.long).to.equal(baseData.gps.long + '.0000000000000');
		});

		// summary_wine tests

		it('should be successful if individual summary_wine has printable chars with control chars (\r\n\t)', async () => {
			let data = {
				summary_wine: 'This has \r\n\t control chars and special chars $&#*!%^&*()_+=-',
				name: 'Test Tasting',
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if individual summary_wine is equal to max(4000)-1 chars', async () => {
			let data = {
				summary_wine: 'a'.repeat(4000 - 1),
				name: 'Test Tasting',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if individual summary_wine is equal to max(4000) chars', async () => {
			let data = {
				summary_wine: 'a'.repeat(4000),
				name: 'Test Tasting',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if individual summary_wine has html(<>) and convert them into html entities', async () => {
			let data = {
				summary_wine: '<h1>This is a wine summary<h1>',
				name: 'Test Tasting',
			};

			let tastingResponse = await createItem(path, data);

			checkForSuccess(tastingResponse);

			// SummaryWine must have converted <> to html entities
			let summaryWine = tastingResponse.data.summary_wine;
			expect(summaryWine.includes('&lt;')).to.be.true;
			expect(summaryWine.includes('&gt;')).to.be.true;
		});

		it('should return an error if individual summary_wine exceed max(4000) chars', async () => {
			let data = {
				summary_wine: 'a'.repeat(4000 + 1),
				name: 'Test Tasting',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if individual summary_wine has non-printable chars other than control chars(\r\n\t)', async () => {
			let data = {
				name: 'Test Tasting',
				summary_wine:
					'This has \r\n\t control chars and non printable chars \x00\x08\x0B\x1F\x7F\x9F\x0C',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		// summary_personal tests

		it('should be successful if individual summary_personal has printable chars with control chars (\r\n\t)', async () => {
			let data = {
				name: 'Test Tasting',
				summary_personal: 'This has \r\n\t control chars and special chars $&#*!%^&*()_+=-',
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if individual summary_personal is equal to max(4000)-1 chars', async () => {
			let data = {
				summary_personal: 'a'.repeat(4000 - 1),
				name: 'Test Tasting',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if individual summary_personal is equal to max(4000) chars', async () => {
			let data = {
				summary_personal: 'a'.repeat(4000),
				name: 'Test Tasting',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if individual summary_personal has html(<>) and convert them into html entities', async () => {
			let data = {
				summary_personal: '<h1>This is a personal summary<h1>',
				name: 'Test Tasting',
			};

			let tastingResponse = await createItem(path, data);

			checkForSuccess(tastingResponse);

			// summaryPersonal must have converted <> to html entities
			let summaryPersonal = tastingResponse.data.summary_personal;
			expect(summaryPersonal.includes('&lt;')).to.be.true;
			expect(summaryPersonal.includes('&gt;')).to.be.true;
		});

		it('should return an error if individual summary_personal exceed max(4000) chars', async () => {
			let data = {
				summary_personal: 'a'.repeat(4000 + 1),
				name: 'Test Tasting',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('return an error if individual summary_personal has non-printable chars other than control chars(\r\n\t)', async () => {
			let data = {
				name: 'Test Tasting',
				summary_personal:
					'This has \r\n\t control chars and non printable chars \x00\x08\x0B\x1F\x7F\x9F\x0C',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		// food_pairing tests

		it('should be successful if individual food_pairing has printable chars with control chars (\r\n\t)', async () => {
			let data = {
				name: 'Test Tasting',
				food_pairing: 'This has \r\n\t control chars and special chars $&#*!%^&*()_+=-',
			};
			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if individual food_pairing is equal to max(4000)-1 chars', async () => {
			let data = {
				food_pairing: 'a'.repeat(4000 - 1),
				name: 'Test Tasting',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if individual food_pairing is equal to max(4000) chars', async () => {
			let data = {
				food_pairing: 'a'.repeat(4000),
				name: 'Test Tasting',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if individual food_pairing has html(<>) and convert them into html entities', async () => {
			let data = {
				food_pairing: '<h1>This is a food pairing<h1>',
				name: 'Test Tasting',
			};

			let tastingResponse = await createItem(path, data);

			checkForSuccess(tastingResponse);

			// summaryPersonal must have converted <> to html entities
			let summaryPersonal = tastingResponse.data.food_pairing;
			expect(summaryPersonal.includes('&lt;')).to.be.true;
			expect(summaryPersonal.includes('&gt;')).to.be.true;
		});

		it('should return an error if individual food_pairing exceed max(4000) chars', async () => {
			let data = {
				food_pairing: 'a'.repeat(4000 + 1),
				name: 'Test Tasting',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('return an error if individual food_pairing has non-printable chars other than control chars(\r\n\t)', async () => {
			let data = {
				name: 'Test Tasting',
				food_pairing:
					'This has \r\n\t control chars and non printable chars \x00\x08\x0B\x1F\x7F\x9F\x0C',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		// localion & gps tests

		it('should be able to save [negative] [lat] and [long] values', async () => {
			// Test tastingResponse first
			let data = {
				name: 'Test Tasting',
				location: 'copenhagen',
				gps: {
					lat: -90,
					long: -180,
				},
			};

			let gpsResponse = await createItem(path, data);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + gpsResponse.data.ref, 'GET');
			let rawTasting = await request(options);

			// Test only for gps data
			expect(rawTasting.individual.lat).to.equal('-90.0000000000000');
			expect(rawTasting.individual.long).to.equal('-180.0000000000000');
		});

		it('should not round off [lat] and [long] within [decimal][16,13]', async () => {
			/* 
				Our Column consists of 16 digits with 13 decimal places.

				This means that for [lat], our values can range from 
				-90.0000000000000 to +90.0000000000000 
				(with regards to validation , the total digits above are only up to 15)

				and for [long], our values can range from 
				-180.0000000000000 to +180.0000000000000
			*/

			let data = {
				name: 'Test Tasting',
				location: 'copenhagen',
				gps: {
					lat: '-89.1234567890123',
					long: '-179.1234567890123',
				},
			};

			let gpsResponse = await createItem(path, data);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + gpsResponse.data.ref, 'GET');
			let rawTasting = await request(options);

			// Test only for gps data
			expect(rawTasting.individual.lat).to.equal('-89.1234567890123');
			expect(rawTasting.individual.long).to.equal('-179.1234567890123');
		});

		it('should have [null] [lat] and [long] if [gps] is not supplied', async () => {
			//Because x:0 y:0 is a location itself
			let data = {
				name: 'Test Tasting',
				location: 'copenhagen',
			};

			let gpsResponse = await createItem(path, data);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + gpsResponse.data.ref, 'GET');
			let rawTasting = await request(options);

			expect(rawTasting.individual.lat).to.equal(null);
			expect(rawTasting.individual.long).to.equal(null);
		});

		it('should not be able to assign a [location] value more than [64] chars', async () => {
			let data = {
				name: 'Test Tasting',
				location: makeUniqueString(65),
				gps: {
					lat: 90,
					long: 181,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should not be able to able to save [gps] with [lat] alone', async () => {
			let data = {
				name: 'Test Tasting',
				location: 'copenhagen',
				gps: {
					lat: 90,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should not be able to able to save [gps] with [long] alone', async () => {
			let data = {
				name: 'Test Tasting',
				location: 'copenhagen',
				gps: {
					long: 180,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should not be able to assign a [lat] value more than [90]', async () => {
			let data = {
				name: 'Test Tasting',
				location: makeUniqueString(64),
				gps: {
					lat: 90.1,
					long: 180,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should not be able to assign a [lat] value less than [-90]', async () => {
			let data = {
				name: 'Test Tasting',
				location: makeUniqueString(64),
				gps: {
					lat: -90.1,
					long: 180,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should not be able to assign a [long] value more than [180]', async () => {
			let data = {
				name: 'Test Tasting',
				location: makeUniqueString(64),
				gps: {
					lat: 90,
					long: 180.1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should not be able to assign a [long] value less than [-180]', async () => {
			let data = {
				name: 'Test Tasting',
				location: makeUniqueString(64),
				gps: {
					lat: 90,
					long: -180.1,
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});
	});
});
