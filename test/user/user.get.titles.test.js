const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	checkStatusCodeByOptions,
	makeUniqueString,
	signPath,
} = require('../common.js');

describe('User', () => {
	describe('Get wine_knowledge titles', () => {
		let options;

		before(async () => {
			options = {...baseGetOptions};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = baseUrl + '/user/titles';
		});

		it('should return correct status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data', async () => {
			let response = await request(options);
			expect(response).to.have.property('user_titles');

			for (let i = 0; i <= response.user_titles.length - 1; i++) {
				let user_title = response.user_titles[i];
				expect(user_title.key).to.be.a('string');
				expect(user_title.name).to.be.a('string');
			}
		});
	});
});
