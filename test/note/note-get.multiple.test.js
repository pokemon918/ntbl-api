const expect = require('chai').expect;
const request = require('request-promise');
const cloneDeep = require('lodash').cloneDeep;

const {
	baseUrl,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	login,
	signPath,
	user,
	userData,
	generateUserData,
	makeUniqueString,
} = require('../common.js');

describe('Note', () => {
	describe('Fetch Multiple Notes', () => {
		let options, baseUserPath, user, userData, notesResponse;

		before(async () => {
			options = {...basePostOptions};
			baseUserPath = baseUrl + '/user';

			// Create user
			user = generateUserData();
			user.name = makeUniqueString();
			user.handle = makeUniqueString();
			userData = await createItem(baseUserPath, user);
			user.ref = userData.data.ref;

			// Initialize array
			notesResponse = [];

			// Add Floral Notes
			options.uri = baseUrl + '/admin/tastingnote/testflora?who=TEX';
			options.body = [
				{lang_key: 'testlangkey1', value: 'flower'},
				{lang_key: 'testlangkey2', value: 'blomst'},
				{lang_key: 'testlangkey3', value: 'florida'},
			];

			let floralResponse = await request(options);
			notesResponse.push(floralResponse);

			// Add Fruity Notes
			options.uri = baseUrl + '/admin/tastingnote/testfructus?who=TEX';
			options.body = [
				{lang_key: 'testlangkey1', value: 'fruity'},
				{lang_key: 'testlangkey2', value: 'frugtagtig'},
				{lang_key: 'testlangkey3', value: 'sabroso'},
			];

			let fruityResponse = await request(options);
			notesResponse.push(fruityResponse);

			// Add Creamy Notes
			options.uri = baseUrl + '/admin/tastingnote/testcrepito?who=TEX';
			options.body = [
				{lang_key: 'testlangkey1', value: 'creamy'},
				{lang_key: 'testlangkey2', value: 'cremet'},
				{lang_key: 'testlangkey3', value: 'cremoso'},
			];

			let creamyResponse = await request(options);
			notesResponse.push(creamyResponse);

			// Simulate login for user
			await login(user.email, user.rawPass);
		});

		describe('get multiple', () => {
			beforeEach(async () => {
				options.method = 'POST';
				options.uri = signPath('/tastingnote', 'POST');
				options.transform = null;
			});

			it('should return proper data', async () => {
				let languages = ['testlangkey1', 'testlangkey2', 'testlangkey3'];
				let keys = ['testflora', 'testfructus', 'testcrepito'];

				options.body = {
					languages: languages,
					keys: keys,
				};

				let response = await request(options);
				response = response.data;

				// Test for Language Quantity
				expect(Object.keys(response).length).to.equal(languages.length);

				// Test for Keys
				for (let ctr = 0; ctr <= Object.keys(response).length - 1; ctr++) {
					let language = languages[ctr];
					let kvPairs = response[language];
					expect(Object.keys(kvPairs).length).to.equal(keys.length);
				}
			});

			// Negative Tests
			it('should not return non existing languages', async () => {
				let validLanguages = ['testlangkey1'];
				let invalidLanguages = ['testlangkey4', 'testlangkey5', 'testlangkey6'];
				let languages = [];
				languages = languages.concat(validLanguages);
				languages = languages.concat(invalidLanguages);

				let keys = ['testflora', 'testfructus', 'testcrepito'];

				options.body = {
					languages: languages,
					keys: keys,
				};

				let response = await request(options);
				response = response.data;

				// Test for Language Quantity
				expect(Object.keys(response).length).to.equal(validLanguages.length);

				// Test Each Valid Language
				for (let ctr = 0; ctr <= validLanguages.length - 1; ctr++) {
					let validLanguage = validLanguages[ctr];
					expect(response[validLanguage]).to.be.an('object');
				}

				// Test Each Invalid Language
				for (let ctr = 0; ctr <= invalidLanguages.length - 1; ctr++) {
					let invalidLanguage = invalidLanguages[ctr];
					expect(response[invalidLanguage]).to.equal(undefined);
				}
			});

			it('should not return non existing keys', async () => {
				let languages = ['testlangkey1', 'testlangkey2', 'testlangkey3'];

				let validkeys = ['testflora', 'testfructus', 'testcrepito'];
				let invalidkeys = [makeUniqueString(5), makeUniqueString(5), makeUniqueString(5)];
				let keys = [];
				keys = keys.concat(validkeys);
				keys = keys.concat(invalidkeys);

				options.body = {
					languages: languages,
					keys: keys,
				};

				let response = await request(options);
				response = response.data;

				// Test for Language Quantity
				expect(Object.keys(response).length).to.equal(languages.length);

				// Test Each Language
				for (let ctr = 0; ctr <= languages.length - 1; ctr++) {
					let language = languages[ctr];
					let kvPairs = response[language];

					// Test Valid Keys
					for (let ctr = 0; ctr <= validkeys.length - 1; ctr++) {
						let validkey = validkeys[ctr];
						expect(kvPairs[validkey]).to.be.an('string');
					}

					// Test Invalid Keys
					for (let ctr = 0; ctr <= invalidkeys.length - 1; ctr++) {
						let invalidKey = invalidkeys[ctr];
						expect(kvPairs[invalidKey]).to.equal(undefined);
					}
				}
			});
		});
	});
});
