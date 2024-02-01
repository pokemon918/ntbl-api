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
	describe('create with subject', () => {
		let options,
			path,
			baseData,
			tastingResponse,
			checkProperSubjectData,
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
				producer: 'test producer',
				country: 'test country',
				region: 'test region',
				vintage: 'test vintage',
				grape: 'test grape',
				price: '100',
				currency: 'USD',
				clean_key: 'clean',
				producer_key: 'producer',
				country_key: 'country',
				region_key: 'region',
			};
			tastingResponse = await createItem(path, baseData);

			checkProperSubjectData = (tasting) => {
				expect(tasting).to.not.have.property('id');
				expect(tasting).to.have.property('subject');
				expect(tasting.subject.name).to.equal('test_name');
				expect(tasting.subject.producer).to.equal('test producer');
				expect(tasting.subject.country).to.equal('test country');
				expect(tasting.subject.region).to.equal('test region');
				expect(tasting.subject.vintage).to.equal('test vintage');
				expect(tasting.subject.grape).to.equal('test grape');
				expect(tasting.subject.price).to.equal('100.0000');
				expect(tasting.subject.currency).to.equal('USD');
				expect(tasting.subject.clean_key).to.equal('clean');
				expect(tasting.subject.producer_key).to.equal('producer');
				expect(tasting.subject.country_key).to.equal('country');
				expect(tasting.subject.region_key).to.equal('region');
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

		it('should create actual subject data in db', async () => {
			// Test tastingResponse first
			expect(tastingResponse).to.have.property('data');
			expect(tastingResponse.data.ref).to.be.a('string').that.have.lengthOf.above(0);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for subject data
			checkProperSubjectData(tasting);
		});

		it('should trim unwanted spaces on all subject fields value and save proper values', async () => {
			let data = {
				name: ' test_name ',
				producer: ' test producer ',
				country: ' test country ',
				region: ' test region ',
				vintage: ' test vintage ',
				grape: ' test grape ',
				price: ' 100 ',
				currency: ' USD ',
				clean_key: ' clean ',
				producer_key: ' producer ',
				country_key: ' country ',
				region_key: ' region ',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for subject data
			checkProperSubjectData(tasting);
		});

		it('should be successful if subject name is equal to max(128)-1 chars', async () => {
			let data = {
				name: 'a'.repeat(128 - 1),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject name is equal to max(128) chars', async () => {
			let data = {
				name: 'a'.repeat(128),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject name has a bunch of utf-8 chars', async () => {
			let data = {
				name: '!@#$%^&*()_-+,.?',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if subject name exceed max(128) chars', async () => {
			let data = {
				name: 'a'.repeat(128 + 1),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject name has html <>', async () => {
			let data = {
				name: '<p>test_name<p>',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject name has non printable chars', async () => {
			let data = {
				name: 'test\r_name',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should be successful if subject producer is equal to max(128)-1 chars', async () => {
			let data = {
				name: 'test_name',
				producer: 'a'.repeat(128 - 1),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject producer is equal to max(128) chars', async () => {
			let data = {
				name: 'test_name',
				producer: 'a'.repeat(128),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject producer has a bunch of utf-8 chars', async () => {
			let data = {
				name: 'test_name',
				producer: '!@#$%^&*()_-+,.?',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if subject producer exceed max(128) chars', async () => {
			let data = {
				name: 'test_name',
				producer: 'a'.repeat(128 + 1),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject producer has html <>', async () => {
			let data = {
				name: 'test_name',
				producer: '<p>withhtml<p>',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject producer has non printable chars', async () => {
			let data = {
				name: 'test_name',
				producer: 'with\rnon\nprintable\tchars',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should be successful if subject country is equal to max(64)-1 chars', async () => {
			let data = {
				name: 'test_name',
				country: 'a'.repeat(64 - 1),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject country is equal to max(64) chars', async () => {
			let data = {
				name: 'test_name',
				country: 'a'.repeat(64),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if subject country exceed exceed max(64) chars', async () => {
			let data = {
				name: 'test_name',
				country: 'a'.repeat(64 + 1),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject country has html <>', async () => {
			let data = {
				name: 'test_name',
				country: '<p>withhtml<p>',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject country has non printable chars', async () => {
			let data = {
				name: 'test_name',
				country: 'with\rnon\nprintable\tchars',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should be successful if subject region is equal to max(255)-1 chars', async () => {
			let data = {
				name: 'test_name',
				region: 'a'.repeat(255 - 1),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject region is equal to max(255) chars', async () => {
			let data = {
				name: 'test_name',
				region: 'a'.repeat(255),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject region has a bunch of utf-8 chars', async () => {
			let data = {
				name: 'test_name',
				region: '!@#$%^&*()_-+,.?',
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if subject region exceed max(255) chars', async () => {
			let data = {
				name: 'test_name',
				region: 'a'.repeat(255 + 1),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject region has html <>', async () => {
			let data = {
				name: 'test_name',
				region: '<p>withhtml<p>',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject region has non printable chars', async () => {
			let data = {
				name: 'test_name',
				region: 'with\rnon\nprintable\tchars',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should be successful if subject vintage is equal to max(64)-1 chars', async () => {
			let data = {
				name: 'test_name',
				vintage: 'a'.repeat(64 - 1),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject vintage is equal to max(64) chars', async () => {
			let data = {
				name: 'test_name',
				vintage: 'a'.repeat(64),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if subject vintage exceed max(64) chars', async () => {
			let data = {
				name: 'test_name',
				vintage: 'a'.repeat(64 + 1),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject vintage has html <>', async () => {
			let data = {
				name: 'test_name',
				vintage: '<p>withhtml<p>',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject vintage has non printable chars', async () => {
			let data = {
				name: 'test_name',
				vintage: 'with\rnon\nprintable\tchars',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should be successful if subject grape is equal to max(128)-1 chars', async () => {
			let data = {
				name: 'test_name',
				grape: 'a'.repeat(128 - 1),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject grape is equal to max(128) chars', async () => {
			let data = {
				name: 'test_name',
				grape: 'a'.repeat(128),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if subject grape exceed max(128) chars', async () => {
			let data = {
				name: 'test_name',
				grape: 'a'.repeat(128 + 1),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject grape has html <>', async () => {
			let data = {
				name: 'test_name',
				grape: '<p>withhtml<p>',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject grape has non printable chars', async () => {
			let data = {
				name: 'test_name',
				grape: 'with\rnon\nprintable\tchars',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should be successful if subject price is numeric and has a valid price format', async () => {
			let data = {
				name: 'test_name',
				price: 100,
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if subject price is not numeric', async () => {
			let data = {
				name: 'test_name',
				price: 'non-numeric',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject price exceeds the limit of 13 whole number places', async () => {
			let data = {
				name: 'test_name',
				price: '10000000000000', //this has 14 whole number places
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject price exceeds the limit of 4 decimal places', async () => {
			let data = {
				name: 'test_name',
				price: '100.00000', //this has 5 decimal places
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should be successful if subject currency is equal to max(16)-1 chars', async () => {
			let data = {
				name: 'test_name',
				currency: 'a'.repeat(16 - 1),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject currency is equal to max(16) chars', async () => {
			let data = {
				name: 'test_name',
				currency: 'a'.repeat(16),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject clean_key is equal to max(64) chars', async () => {
			let data = {
				name: 'test_name',
				clean_key: makeUniqueString(64),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject producer_key is equal to max(64) chars', async () => {
			let data = {
				name: 'test_name',
				producer_key: makeUniqueString(64),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject country_key is equal to max(64) chars', async () => {
			let data = {
				name: 'test_name',
				country_key: makeUniqueString(64),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject region_key is equal to max(64) chars', async () => {
			let data = {
				name: 'test_name',
				region_key: makeUniqueString(64),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject clean_key is null', async () => {
			let data = {
				name: 'test_name',
				clean_key: null,
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject producer_key is null', async () => {
			let data = {
				name: 'test_name',
				producer_key: null,
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject country_key is null', async () => {
			let data = {
				name: 'test_name',
				country_key: null,
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if subject region_key is null', async () => {
			let data = {
				name: 'test_name',
				region_key: null,
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should return an error if subject currency exceed max(16) chars', async () => {
			let data = {
				name: 'test_name',
				currency: 'a'.repeat(16 + 1),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject [clean_key] exceed max(64) chars', async () => {
			let data = {
				name: 'test_name',
				clean_key: makeUniqueString(65),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject [producer_key] exceed max(64) chars', async () => {
			let data = {
				name: 'test_name',
				producer_key: makeUniqueString(65),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject [country_key] exceed max(64) chars', async () => {
			let data = {
				name: 'test_name',
				country_key: makeUniqueString(65),
			};

			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if subject [region_key] exceed max(64) chars', async () => {
			let data = {
				name: 'test_name',
				region_key: makeUniqueString(65),
			};

			await checkCreateStatusCode(path, data, 400);
		});
	});
});
