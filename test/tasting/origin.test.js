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
	describe('create with origin', () => {
		let options,
			path,
			baseData,
			tastingResponse,
			baseUserPath,
			user,
			userData,
			flow,
			client,
			version;

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

			flow = 'quick';
			client = 'web';
			version = '2.0.1-rc+3456';

			path = signPath('/tasting', 'POST');
			baseData = {
				source: `${flow}/${client}/${version}`,
				name: 'test_name',
			};
			tastingResponse = await createItem(path, baseData);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			path = signPath('/tasting', 'POST');
		});

		// Positive Tests
		it('should return correct status code', async () => {
			let response = await createItem(path, baseData, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful', async () => {
			checkForSuccess(tastingResponse);
		});

		it('should create actual [origin] data in db', async () => {
			// Test tastingResponse first
			expect(tastingResponse).to.have.property('data');
			expect(tastingResponse.data).to.not.have.property('id');
			expect(tastingResponse.data.ref).to.be.a('string').that.have.lengthOf.above(0);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for origin data
			expect(tasting).to.have.property('origin');
			expect(tasting.origin.flow).to.equal(flow);
			expect(tasting.origin.client).to.equal(client);
			expect(tasting.origin.version).to.equal(version);
		});

		it('should create [origin] [version] with [plus] and [minus] signs', async () => {
			let data = {
				source: `${flow}/${client}/1.0+r-c+r-c`,
				name: 'test_name',
			};

			let statusCode = 0;
			let withMultiDashesOrigin = await createItem(path, data);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + withMultiDashesOrigin.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for origin data
			expect(tasting).to.have.property('origin');
			expect(tasting.origin.flow).to.equal(flow);
			expect(tasting.origin.client).to.equal(client);
			expect(tasting.origin.version).to.equal('1.0+r-c+r-c');
		});

		it('should trim unwanted spaces on [origin] [flow] value and save proper value', async () => {
			let data = {
				source: ' quick /web/2.0.1-rc+3456',
				name: 'test_name',
			};

			let statusCode = 0;
			let withMultiDashesOrigin = await createItem(path, data);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + withMultiDashesOrigin.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for origin data
			expect(tasting).to.have.property('origin');
			expect(tasting.origin.flow).to.equal(flow);
			expect(tasting.origin.client).to.equal(client);
			expect(tasting.origin.version).to.equal(version);
		});

		it('should trim unwanted spaces on [origin] [client] value and save proper value', async () => {
			let data = {
				source: 'quick/ web /2.0.1-rc+3456',
				name: 'test_name',
			};

			let statusCode = 0;
			let withMultiDashesOrigin = await createItem(path, data);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + withMultiDashesOrigin.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for origin data
			expect(tasting).to.have.property('origin');
			expect(tasting.origin.flow).to.equal(flow);
			expect(tasting.origin.client).to.equal(client);
			expect(tasting.origin.version).to.equal(version);
		});

		it('should trim unwanted spaces on [origin] [version] value and save proper value', async () => {
			let data = {
				source: 'quick/web/ 2.0.1-rc+3456 ',
				name: 'test_name',
			};

			let statusCode = 0;
			let withMultiDashesOrigin = await createItem(path, data);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + withMultiDashesOrigin.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for origin data
			expect(tasting).to.have.property('origin');
			expect(tasting.origin.flow).to.equal(flow);
			expect(tasting.origin.client).to.equal(client);
			expect(tasting.origin.version).to.equal(version);
		});

		it('should be successful if [origin] [flow] is equal to max(16)-1 chars', async () => {
			let data = {
				source: 'a'.repeat(16) - 1 + '/' + client + '/' + version,
				name: 'test_name',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if [origin] [flow] is equal to max(16) chars', async () => {
			let data = {
				source: 'a'.repeat(16) + '/' + client + '/' + version,
				name: 'test_name',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if [origin] [client] is equal to max(32)-1 chars', async () => {
			let data = {
				source: flow + '/' + 'a'.repeat(32 - 1) + '/1.0.0',
				name: 'test_name',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if [origin] [client] is equal to max(32) chars', async () => {
			let data = {
				source: flow + '/' + 'a'.repeat(32) + '/1.0.0',
				name: 'test_name',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if [origin] [version] is equal to max(16)-1 chars', async () => {
			let data = {
				source: flow + '/' + client + '/' + '1'.repeat(16) - 1,
				name: 'test_name',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if [origin] [version] is equal to max(16) chars', async () => {
			let data = {
				source: flow + '/' + client + '/' + '1'.repeat(16),
				name: 'test_name',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		// Negative Tests
		it('should return an error if origin has invalid format [only contains the flow]', async () => {
			let data = {
				source: flow,
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if origin has invalid format [only contains the client]', async () => {
			let data = {
				source: client,
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if origin has invalid format [only contains the version]', async () => {
			let data = {
				source: version,
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if origin has invalid format [only contains the flow and client]', async () => {
			let data = {
				source: flow + '/' + client,
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if origin has invalid format [only contains the flow and version]', async () => {
			let data = {
				source: flow + '/' + version,
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if origin has invalid format [only contains the client and version]', async () => {
			let data = {
				source: client + '/' + version,
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if origin do not have slash(/)', async () => {
			let data = {
				source: 'quickweb2.0.1-rc+3456',
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [origin] [client] exceeds max(32) chars', async () => {
			let data = {
				source: flow + '/' + makeUniqueString(33) + '/1.0.0',
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [origin] [flow] exceeds max(16) chars', async () => {
			let data = {
				source: makeUniqueString(17) + '/' + client + '/' + version,
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [origin] [version] exceeds max(16) chars', async () => {
			let data = {
				source: flow + '/' + client + '/' + makeUniqueString(17),
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [origin] [flow] has html <>', async () => {
			let data = {
				source: '<p>quick</p>' + '/' + client + '/' + version,
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [origin] [client] has html <>', async () => {
			let data = {
				source: flow + '/<p>test<p>/' + version,
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [origin] [version] has html <>', async () => {
			let data = {
				source: flow + '/' + client + '/' + '<p>1.0.0</p>',
				name: 'test_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [origin] [flow] has non printable chars', async () => {
			let data = {
				source: 'fl\r\n\tow' + '/' + client + '/' + version,
				name: 'test_name',
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [origin] [client] has non printable chars', async () => {
			let data = {
				source: flow + '/te \r \n \t st/' + version,
				name: 'test_name',
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if [origin] [version] has non printable chars', async () => {
			let data = {
				source: flow + '/' + client + '/' + '1\r\n\t.0.0',
				name: 'test_name',
			};

			await checkCreateStatusCode(path, data, 400);
		});
	});
});
