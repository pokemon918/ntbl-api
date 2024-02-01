const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	login,
	signPath,
} = require('../common.js');

describe('Note', () => {
	let options;

	before(() => {
		options = {...basePostOptions};
	});

	describe('create by key', () => {
		let path, data, newNote, user;

		before(async () => {
			//User
			let createUserPath = baseUrl + '/user';
			user = generateUserData();
			await createItem(createUserPath, user);
			await login(user.email, user.rawPass);

			//Note
			path = '/tastingnote/newkey';
			data = [
				{lang_key: 'testlangkey1', value: 'sultan32a'},
				{lang_key: 'testlangkey2', value: 'saenz11'},
			];
			newNote = await createItem(signPath('/admin' + path, 'POST'), data);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath('/admin' + path, 'POST');
		});

		it('should return correct success status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 201);
		});

		it('should be successful', async () => {
			checkForSuccess(newNote);
		});

		it('should create an actual rows in db', async () => {
			options.method = 'GET';
			options.uri = signPath(path);

			let note = await request(options);
			expect(note).to.not.have.property('id');
			expect(note).to.have.property('note_key');
			expect(note).to.have.property('lang');
			expect(note.note_key).to.be.a('string');
			expect(note.lang).to.be.an('array');
			expect(note.note_key).to.equal('newkey');
			expect(note.lang[0].lang_key).to.equal('testlangkey1');
			expect(note.lang[0].val).to.equal('sultan32a');
			expect(note.lang[1].lang_key).to.equal('testlangkey2');
			expect(note.lang[1].val).to.equal('saenz11');
		});

		it('should create for keys with capital letters', async () => {
			options.method = 'POST';
			options.uri = signPath('/admin/tastingnote/caPitalLetters', 'POST');
			let response = await request(options);
			expect(response.status).to.equal('success');
		});

		it('should not create for keys with invalid characters', async () => {
			options.method = 'POST';
			options.uri = signPath('/admin/tastingnote/!mynewkey&*)(', 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not create new [lang] with non-existing [lang_key]', async () => {
			options.method = 'POST';
			options.uri = signPath('/admin/tastingnote/' + makeUniqueString(16), 'POST');
			options.body = [
				{lang_key: makeUniqueString(2), value: 'sultan32a'},
				{lang_key: makeUniqueString(2), value: 'saenz11'},
			];
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
