const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	generateUserData,
	makeUniqueString,
	login,
	signPath,
} = require('../common.js');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
let user = {};

describe('Impression', () => {
	describe('get raw data by ref', () => {
		let options,
			path,
			user,
			userData,
			baseUserPath,
			createData,
			tastingResponse,
			getPath,
			createPath,
			checkProperRawImpressionData;

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

			createPath = signPath('/tasting', 'POST');
			createData = {name: 'Test Tasting'};
			// create a test tasting item first
			tastingResponse = await createItem(createPath, createData);

			checkProperRawImpressionData = (tasting) => {
				// Check for property existence
				expect(tasting).to.have.property('impression');
				expect(tasting).to.have.property('lifecycle');
				expect(tasting).to.have.property('origin');
				expect(tasting).to.have.property('subject');
				expect(tasting).to.have.property('individual');
				expect(tasting).to.have.property('stats');
				expect(tasting).to.have.property('rating');

				// Check for correct data type for root payload fields
				expect(tasting.impression).to.be.an('object');
				expect(tasting.lifecycle).to.be.an('object');
				expect(tasting.origin).to.be.an('object');
				expect(tasting.subject).to.be.an('object');
				expect(tasting.individual).to.be.an('object');
				expect(tasting.stats).to.be.an('array');
				expect(tasting.rating).to.be.an('object');
				expect(tasting.notes).to.be.an('object');

				// Check for correct data type for impression fields
				expect(parseInt(tasting.impression.id)).to.be.an('number');
				expect(tasting.impression.ref).to.be.a('string');
				expect(parseInt(tasting.impression.lifecycle_id)).to.be.an('number');
				expect(parseInt(tasting.impression.origin_id)).to.be.an('number');
				expect(tasting.impression.owner_ref).to.be.a('string');
				expect(parseInt(tasting.impression.impression_type_id)).to.be.an('number');
				expect(tasting.impression.created_at).to.be.a('string');
				expect(tasting.impression.updated_at).to.be.a('string');

				// Check for correct data type for lifecycle fields
				expect(parseInt(tasting.lifecycle.id)).to.be.an('number');
				expect(tasting.lifecycle.status).to.be.a('string');

				// Check for correct data type for origin fields
				expect(parseInt(tasting.origin.id)).to.be.an('number');
				expect(tasting.origin.client).to.be.a('string');
				expect(tasting.origin.version).to.be.a('string');

				// Check for correct data type for subject fields
				expect(parseInt(tasting.subject.id)).to.be.an('number');
				expect(parseInt(tasting.subject.impression_id)).to.be.an('number');
				expect(tasting.subject.name).to.be.a('string');
				expect(tasting.subject.producer).to.be.a('string');
				expect(tasting.subject.country).to.be.a('string');
				expect(tasting.subject.region).to.be.a('string');
				expect(tasting.subject.vintage).to.be.a('string');
				expect(tasting.subject.grape).to.be.a('string');

				// Check for correct data type for individual fields
				expect(parseInt(tasting.individual.id)).to.be.an('number');
				expect(parseInt(tasting.individual.impression_id)).to.be.an('number');
				expect(tasting.individual.summary_wine).to.be.a('string');
				expect(tasting.individual.summary_personal).to.be.a('string');

				// Check for expected values
				expect(tasting.impression.ref).to.equal(tastingResponse.data.ref);
				expect(tasting.impression.lifecycle_id).to.equal(1);
				expect(tasting.impression.origin_id).to.equal(0);
				expect(tasting.impression.owner_ref).to.equal(userData.data.ref);
				expect(tasting.impression.impression_type_id).to.equal(1);
				expect(tasting.lifecycle.id).to.equal(1);
				expect(tasting.lifecycle.status).to.equal('Fully created');
				expect(tasting.origin.id).to.equal(0);
				expect(tasting.origin.client).to.equal('Unknown');
				expect(tasting.origin.version).to.equal('0.0.0');
				expect(tasting.subject.name).to.equal('Test Tasting');
				expect(tasting.subject.producer).to.equal('');
				expect(tasting.subject.country).to.equal('');
				expect(tasting.subject.region).to.equal('');
				expect(tasting.subject.vintage).to.equal('');
				expect(tasting.subject.grape).to.equal('');
				expect(tasting.individual.summary_wine).to.equal('');
				expect(tasting.individual.summary_personal).to.equal('');
				expect(tasting.stats).to.be.an('array').that.is.empty;
				expect(tasting.rating).to.be.an('object').that.is.empty;
				expect(tasting.notes).to.be.an('object').that.is.empty;
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
		});

		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have proper data', async () => {
			let tasting = await request(options);
			checkProperRawImpressionData(tasting);
		});

		it('should be still return proper data if ref has uppercase chars', async () => {
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref.toUpperCase(), 'GET');
			let tasting = await request(options);
			checkProperRawImpressionData(tasting);
		});

		it('should be return error if ref has illegal chars', async () => {
			options.uri = signPath('/raw/impression/!' + makeUniqueString(), 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be return error if ref has non-printable chars', async () => {
			options.uri = signPath('/raw/impression/' + '\n' + tastingResponse.data.ref + '\t', 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be return error if ref is empty', async () => {
			options.uri = signPath('/raw/impression/' + null, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be return error for non-existing ref', async () => {
			options.uri = signPath('/raw/impression/' + 'nonExistingRef', 'GET');
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

			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
