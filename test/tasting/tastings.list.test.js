const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	login,
	signPath,
	makeUniqueString,
	generateUserData,
} = require('../common.js');

describe('Tastings', () => {
	describe('get list', () => {
		let options, path, tastingList, checkProperTastingData, baseUserPath, user, userData;

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

			path = '/tastings';
			options.method = 'GET';
			options.uri = signPath(path);
			tastingList = await request(options);

			checkProperTastingData = (tasting) => {
				// Check for property existence
				expect(tasting).to.not.have.property('id');
				expect(tasting).to.have.property('name');
				expect(tasting).to.have.property('producer');
				expect(tasting).to.have.property('country');
				expect(tasting).to.have.property('region');
				expect(tasting).to.have.property('vintage');
				expect(tasting).to.have.property('grape');
				expect(tasting).to.have.property('summary_wine');
				expect(tasting).to.have.property('summary_personal');
				expect(tasting).to.have.property('food_pairing');
				expect(tasting).to.have.property('drinkability');
				expect(tasting).to.have.property('rating');
				expect(tasting).to.have.property('notes');
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
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath(path);
		});

		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have proper data', async () => {
			tastingList.forEach((tasting) => {
				checkProperTastingData(tasting);
			});
		});
	});
});
