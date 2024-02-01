const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	createItem,
	checkStatusCodeByOptions,
	generateUserData,
	login,
	signPath,
	makeUniqueString,
} = require('../common.js');

// Guarantee that any of the devRefs will not be used if $who is null
describe('Require Who', () => {
	let options, routes;

	before(async () => {
		options = {...baseGetOptions};
		options.method = 'GET';
		options.uri = baseUrl + '/admin/authroutes?who=TEX';
		routes = await request(options);
	});

	beforeEach(async () => {
		options.body = {};
		options.transform = null;
		options.method = '';
		options.uri = '';
	});

	it('should require who for authenticated routes', () => {
		describe('', async () => {
			for (let ctr = 0; ctr <= routes.length - 1; ctr++) {
				let route = routes[ctr];

				it(route.method + ' ' + route.uri, async () => {
					options.method = route.method;
					options.uri = baseUrl + '/' + route.uri;
					await checkStatusCodeByOptions(options, 401);
				});
			}
		});
	});
});
