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
	makeRandomInt,
	createItem,
	checkStatusCodeByOptions,
} = require('../common.js');

describe('Note', () => {
	let options, baseUserPath, user, userData;
	const notesIndexToTest = 2;

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

	beforeEach(() => {
		options = {...baseGetOptions};
		options.method = 'GET';
		options.uri = signPath('/tastingnote/testkey1', 'GET');
	});

	describe('get by key', () => {
		beforeEach(async () => {
			options.transform = null;
		});

		it('should return correct success status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data', async () => {
			let note = await request(options);

			expect(note).to.not.have.property('id');
			expect(note).to.have.property('note_key');
			expect(note).to.have.property('lang');

			expect(note.note_key).to.be.a('string');
			expect(note.lang).to.be.an('array');
		});

		it('should return expected data', async () => {
			let note = await request(options);
			expect(note.note_key).to.equal('testkey1');
			expect(note.lang[0].lang_key).to.equal('testlangkey3');
			expect(note.lang[0].val).to.equal('l18nval3');
		});

		it('should return proper data for keys with capital letters', async () => {
			options.uri = signPath('/tastingnote/TestKey1', 'GET');
			let note = await request(options);

			expect(note).to.have.property('note_key');
			expect(note).to.have.property('lang');

			expect(note.note_key).to.be.a('string');
			expect(note.lang).to.be.an('array');
		});

		it('should return an error for non-existing key', async () => {
			options.uri = signPath('/tastingnote/thiskeydoesnotexists', 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});

	describe('return expected data for all valid notes', () => {
		before(async () => {
			options.transform = null;
		});

		for (let i = 0; i < notesIndexToTest; i++) {
			let seed = makeRandomInt(0, validNotes.length);
			it(validNotes[seed], async () => {
				options.url = baseUrl + '/tastingnote/' + validNotes[seed];
				await checkStatusCodeByOptions(options, 200);
			});
		}
	});
});
