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
	deprecateNotes,
} = require('../common.js');

describe('Note', () => {
	let options;

	before(() => {
		options = {...basePostOptions};
	});

	describe('Activate notes', () => {
		let activatePath, data, testNotes, user;

		before(async () => {
			activatePath = '/admin/notes/activate';

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
			options.uri = signPath(activatePath, 'POST');

			//refresh the testNotes before each test
			await deprecateNotes(testNotes);
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
			let activatedNotes = response.data.activated_notes;

			// Test whether the test notes were really deprecated
			for (let i = 0; i < activatedNotes.length; i++) {
				expect(activatedNotes[i].deprecated).to.equal(0);
				expect(testNotes.notes.includes(activatedNotes[i].key)).to.equal(true);
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
