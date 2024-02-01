const expect = require('chai').expect;
const request = require('request-promise');
const cloneDeep = require('lodash').cloneDeep;
const validNotes = require('./data/valid-notes.json');

const {
	baseUrl,
	baseGetOptions,
	basePostOptions,
	login,
	signPath,
	generateUserData,
	makeUniqueString,
	createItem,
	checkStatusCodeByOptions,
	checkForSuccess,
} = require('../common.js');

describe('Note', () => {
	let options, baseUserPath, user, userData;

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
	});

	describe('get list of valid notes', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = signPath('/admin/notes');
		});

		it('should return correct success status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should have proper data', async () => {
			let validNotes = await request(options);
			expect(validNotes).to.be.a('array');

			let testKeys = ['testkey1', 'testkey2', 'testkey2'];

			for (let i = 0; i < testKeys.length; i++) {
				expect(validNotes.includes(testKeys[i])).to.equal(true);
			}
		});
	});
});
