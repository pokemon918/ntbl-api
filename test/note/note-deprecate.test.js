const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	baseGetOptions,
	createItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	login,
	signPath,
	activateNotes,
} = require('../common.js');

describe('Note', () => {
	let options;

	before(() => {
		options = {...basePostOptions};
	});

	describe('Deprecate notes', () => {
		let deprecatePath, data, testNotes, user;

		before(async () => {
			deprecatePath = '/admin/notes/deprecate';

			//User
			let createUserPath = baseUrl + '/user';
			user = generateUserData();
			await createItem(createUserPath, user);
			await login(user.email, user.rawPass);

			// Note: as of 08/01/2019 these are listed to be valid notes
			testNotes = {
				notes: ['testkey1', 'testkey2', 'testkey3'],
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.body = testNotes;
			options.uri = signPath(deprecatePath, 'POST');

			//refresh the testNotes before each test
			await activateNotes(testNotes);
		});

		it('should return correct success status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful', async () => {
			let response = await request(options);
			checkForSuccess(response);
		});

		it('should deprecate actual keys from DB', async () => {
			// Deprecate notes
			let response = await request(options);
			let deprecatedNotes = response.data.deprecated_notes;

			// Test whether the test notes were really deprecated
			for (let i = 0; i < deprecatedNotes.length; i++) {
				expect(deprecatedNotes[i].deprecated).to.equal(1);
				expect(testNotes.notes.includes(deprecatedNotes[i].key)).to.equal(true);
			}
		});

		// Negative test
		it('should return an error if there is even one non-existing note key in the array', async () => {
			let nonExistingNotes = {
				notes: ['testkey1', 'testkey2', 'testkey3', makeUniqueString()],
			};

			options.body = nonExistingNotes;
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
