const expect = require('chai').expect;
const request = require('request-promise');
const {baseUrl, baseGetOptions, createItem, checkStatusCodeByOptions} = require('../common.js');

describe('Stats', () => {
	describe('Get All Stats', () => {
		let options, path, tastingList, checkProperTastingData;

		before(async () => {
			options = {...baseGetOptions};
			path = baseUrl + '/admin/stats';
			options.uri = path;
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = path;
		});

		it('should return correct data from a whitelisted ip', async () => {
			let statResponse = await request(options);
			expect(statResponse).to.have.property('users');
			expect(statResponse).to.have.property('collections');
			expect(statResponse).to.have.property('impressions');

			expect(statResponse.users).to.be.a('number');
			expect(statResponse.collections).to.be.a('number');
			expect(statResponse.impressions).to.be.a('number');
		});
	});
});
