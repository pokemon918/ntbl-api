const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkCreateStatusCode,
	checkForSuccess,
	signPath,
	login,
	makeUniqueString,
	generateUserData,
} = require('../common.js');

describe('Tasting', () => {
	describe('create with stats', () => {
		let options,
			path,
			baseData,
			tastingResponse,
			checkProperStatsData,
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
			baseData = {
				name: 'test_name',
				stats: [{start: 500}, {time: 39.2}],
			};
			tastingResponse = await createItem(path, baseData);

			checkProperStatsData = (tasting) => {
				expect(tasting).to.not.have.property('id');
				expect(tasting).to.have.property('stats');
				expect(tasting.stats[0].impression_id).to.be.a('number');
				expect(tasting.stats[1].impression_id).to.be.a('number');
				expect(tasting.stats[0].event).to.equal('start');
				expect(tasting.stats[1].event).to.equal('time');
				expect(tasting.stats[0].value).to.equal(500);
				expect(tasting.stats[1].value).to.equal(39.2);
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

		it('should create actual stats data in db', async () => {
			// Test tastingResponse first
			expect(tastingResponse).to.have.property('data');
			expect(tastingResponse.data.ref).to.be.a('string').that.have.lengthOf.above(0);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for stats data
			checkProperStatsData(tasting);
		});

		it('should trim unwanted spaces on stats event value and save proper value', async () => {
			let data = {
				name: 'test_name',
				stats: [{' start ': 500}, {' time ': 39.2}],
			};

			let statusCode = 0;
			let withMultiDashesSource = await createItem(path, data);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + withMultiDashesSource.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for source data
			checkProperStatsData(tasting);
		});

		it('should trim leading zeroes on stats value field and save it properly', async () => {
			let data = {
				name: 'test_name',
				stats: [{start: '00500'}, {time: '00039.2'}],
			};

			let statusCode = 0;
			let withMultiDashesSource = await createItem(path, data);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + withMultiDashesSource.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for stats data
			checkProperStatsData(tasting);
		});

		it('should be successful if stats event is equal to max(32)-1 chars', async () => {
			let data = {name: 'test_name', stats: [{}]};
			data.stats[0]['a'.repeat(32 - 1)] = 500;

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if stats event is equal to max(32) chars', async () => {
			let data = {name: 'test_name', stats: [{}]};
			data.stats[0]['a'.repeat(32)] = 500;

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if stats event exceed max(32) chars', async () => {
			let data = {name: 'test_name', stats: [{}]};
			data.stats[0]['a'.repeat(32 + 1)] = 500;

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if stats value is numeric not numeric', async () => {
			let data = {
				name: 'test_name',
				stats: [{eventname: 'not numeric'}],
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if stats value is not numeric', async () => {
			let data = {
				name: 'test_name',
				stats: [{eventname: 'not numeric'}],
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating version has html <>', async () => {
			let data = {
				name: 'test_name',
				stats: [{'<div>html</div>': 500}],
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if rating version has non printable chars', async () => {
			let data = {
				name: 'test_name',
				stats: [{'te\r \n \tst': 500}],
			};
			await checkCreateStatusCode(path, data, 400);
		});
	});
});
