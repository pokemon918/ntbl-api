const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	makeUniqueString,
	generateUserData,
	login,
	signPath,
} = require('../common.js');

describe('Tasting', () => {
	describe('get by ref', () => {
		let options,
			path,
			baseData,
			tastingResponse,
			getPath,
			checkProperTastingData,
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

			path = '/tasting';
			baseData = {name: 'Test Tasting'};

			// create a test tasting item first
			tastingResponse = await createItem(signPath(path, 'POST'), baseData);
			getPath = path + '/' + tastingResponse.data.ref;

			checkProperTastingData = (tasting) => {
				// Check for property existence
				expect(tasting).to.not.have.property('id');
				expect(tasting).to.have.property('ref');
				expect(tasting).to.have.property('name');
				expect(tasting).to.have.property('producer');
				expect(tasting).to.have.property('country');
				expect(tasting).to.have.property('region');
				expect(tasting).to.have.property('vintage');
				expect(tasting).to.have.property('grape');
				expect(tasting).to.have.property('summary_wine');
				expect(tasting).to.have.property('summary_personal');
				expect(tasting).to.have.property('food_pairing');
				expect(tasting).to.have.property('rating');
				expect(tasting).to.have.property('notes');
				expect(tasting).to.have.property('images');
				expect(tasting).to.have.property('created_at');
				expect(tasting).to.have.property('price');
				expect(tasting).to.have.property('currency');
				expect(tasting).to.have.property('clean_key');
				expect(tasting).to.have.property('producer_key');
				expect(tasting).to.have.property('country_key');
				expect(tasting).to.have.property('region_key');
				expect(tasting).to.have.property('collection');
				expect(tasting).to.have.property('metadata');
				expect(tasting).to.have.property('location');
				expect(tasting).to.have.property('source');
				expect(tasting).to.have.property('info');
				expect(tasting).to.have.property('mold');
				expect(tasting).to.not.have.property('gps');
				expect(tasting).to.not.have.property('origin');

				// Check for correct data type
				expect(tasting.ref).to.be.a('string');
				expect(tasting.name).to.be.a('string');
				expect(tasting.producer).to.be.a('string');
				expect(tasting.country).to.be.a('string');
				expect(tasting.region).to.be.a('string');
				expect(tasting.vintage).to.be.a('string');
				expect(tasting.grape).to.be.a('string');
				expect(tasting.summary_wine).to.be.a('string');
				expect(tasting.summary_personal).to.be.a('string');
				expect(tasting.food_pairing).to.be.a('string');
				expect(tasting.rating).to.be.an('object');
				expect(tasting.notes).to.be.an('object');
				expect(tasting.images).to.be.an('array');
				expect(tasting.created_at).to.be.a.dateString();
				expect(tasting.price).to.be.a('number');
				expect(tasting.currency).to.be.a('string');
				expect(tasting.clean_key).to.be.a('string');
				expect(tasting.producer_key).to.be.a('string');
				expect(tasting.country_key).to.be.a('string');
				expect(tasting.region_key).to.be.a('string');
				expect(tasting.source).to.be.a('string');
				expect(tasting.info).to.be.an('object');

				expect(tasting.collection).to.satisfy(function (collection) {
					return collection === null || typeof collection === 'string';
				});

				expect(tasting.metadata).to.satisfy(function (metadata) {
					return metadata === null || typeof metadata === 'object';
				});

				expect(tasting.location).to.be.a('string');

				// Check for value
				expect(tasting.name).to.equal('Test Tasting');
				expect(tasting.producer).to.equal('');
				expect(tasting.country).to.equal('');
				expect(tasting.region).to.equal('');
				expect(tasting.vintage).to.equal('');
				expect(tasting.grape).to.equal('');
				expect(tasting.summary_wine).to.equal('');
				expect(tasting.summary_personal).to.equal('');
				expect(tasting.rating).to.eql({});
				expect(tasting.notes).to.eql({});
				expect(tasting.images).to.eql([]);
				expect(tasting.location).to.equal('');
				expect(Object.keys(tasting.rating).length).to.equal(0);
				expect(Object.keys(tasting.notes).length).to.equal(0);
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(getPath, 'GET');
		});

		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have proper data', async () => {
			let tasting = await request(options);
			checkProperTastingData(tasting);
		});

		it('should be still return proper data if ref has uppercase chars', async () => {
			options.uri = signPath(path + '/' + tastingResponse.data.ref.toUpperCase());

			let tasting = await request(options);
			checkProperTastingData(tasting);
		});

		it('should be return error if ref has illegal chars', async () => {
			options.uri = signPath(path + '/!' + makeUniqueString());
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be return error if ref has non-printable chars', async () => {
			options.uri = signPath(path + '/\r' + tastingResponse.data.ref + '\t');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be return error if ref is empty', async () => {
			options.uri = signPath(path + '/' + null);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be return error for non-existing ref', async () => {
			options.uri = signPath(path + '/nonExistingRef');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to access tasting that belongs to other user', async () => {
			/*
				Scenario:
				- Create and login a new user
				- Accessing a tasting created by dev should result in an error
			*/

			// Create new user
			let createUserPath = baseUrl + '/user';
			let data = generateUserData();
			let response = await createItem(createUserPath, data);

			// Simulate login
			await login(data.email, data.rawPass);

			options.uri = signPath('/tasting/' + tastingResponse.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
