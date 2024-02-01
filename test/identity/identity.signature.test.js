const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	getItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	makeUniqueString,
	signPath,
	login,
} = require('../common.js');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
let user = {};

const generateUserData = () => {
	user.email = 'email_' + makeUniqueString() + '@ntbl-api.com';
	user.rawPass = '1q1q';
	return getAuthCreationPayload(user.rawPass, user.email);
};

describe('Identity Signature', () => {
	let options,
		userRef,
		encodedUserRef,
		who,
		invalidWho,
		tastingNoteData,
		tastingData,
		testUser,
		testTasting;

	before(async () => {
		options = {...basePostOptions};
		let path = baseUrl + '/user';
		let data = generateUserData();
		let response = await createItem(path, data);
		userRef = response.data.ref;

		// Simulate login
		await login(user.email, user.rawPass);

		invalidWho = '?who=abc1234';

		// Init test Note
		tastingNoteData = [
			{lang_key: 'testlangkey1', value: 'sultan32a'},
			{lang_key: 'testlangkey2', value: 'saenz11'},
		];

		// Init testTasting
		let signedTastingPath = signPath('/tasting', 'POST');
		let tastingData = {name: 'test_name'};
		testTasting = await createItem(signedTastingPath, tastingData);
	});

	beforeEach(async () => {
		options.transform = null;
		options.method = 'POST';
	});

	/******************   Positive tests.   ******************/

	it('should accept valid signature for create note route', async () => {
		let path = signPath('/admin/tastingnote/newkey', 'POST');
		let data = tastingNoteData;
		let newNote = await createItem(path, data);
		checkForSuccess(newNote);
	});

	it('should accept valid signature for get note route', async () => {
		options.method = 'GET';
		options.uri = signPath('/tastingnote/newkey');
		options.data = tastingNoteData;
		await checkStatusCodeByOptions(options, 200);
	});

	it('should accept valid signature for create tasting route', async () => {
		checkForSuccess(testTasting);
	});

	it('should accept valid signature for get tasting route', async () => {
		options.method = 'GET';
		options.uri = signPath('/tasting/' + testTasting.data.ref);
		await checkStatusCodeByOptions(options, 200);
	});

	it('should accept valid signature for get tasting list route', async () => {
		options.method = 'GET';
		options.uri = signPath('/tastings/');
		await checkStatusCodeByOptions(options, 200);
	});

	it('should accept valid signature for get raw impression route', async () => {
		options.method = 'GET';
		options.uri = signPath('/raw/impression/' + testTasting.data.ref);
		await checkStatusCodeByOptions(options, 200);
	});

	it('should accept valid signature for get raw identity route', async () => {
		options.method = 'GET';
		options.uri = signPath('/raw/identity/' + userRef);
		await checkStatusCodeByOptions(options, 200);
	});

	/******************   Negative tests.   ******************/

	it('should not accept an invalid signature for create note route', async () => {
		options.uri = baseUrl + '/admin/tastingnote/newkey' + invalidWho;
		options.data = tastingNoteData;
		await checkStatusCodeByOptions(options, 401);
	});

	it('should not accept an invalid signature for get note route', async () => {
		options.method = 'GET';
		options.uri = baseUrl + '/tastingnote/newkey' + invalidWho;
		options.data = tastingNoteData;
		await checkStatusCodeByOptions(options, 401);
	});

	it('should not accept an invalid signature for create tasting route', async () => {
		options.uri = baseUrl + '/tasting' + invalidWho;
		options.data = tastingData;
		await checkStatusCodeByOptions(options, 401);
	});

	it('should not accept an invalid signature for get tasting route', async () => {
		options.method = 'GET';
		options.uri = baseUrl + '/tasting/' + testTasting.data.ref + invalidWho;
		await checkStatusCodeByOptions(options, 401);
	});

	it('should not accept an invalid signature for get tasting list route', async () => {
		options.method = 'GET';
		options.uri = baseUrl + '/tastings/' + invalidWho;
		await checkStatusCodeByOptions(options, 401);
	});

	it('should not accept an invalid signature for get raw impression route', async () => {
		options.method = 'GET';
		options.uri = baseUrl + '/raw/impression/' + testTasting.data.ref + invalidWho;
		await checkStatusCodeByOptions(options, 401);
	});

	it('should not accept an invalid signature for get raw identity route', async () => {
		options.method = 'GET';
		options.uri = baseUrl + '/raw/identity/' + encodedUserRef + invalidWho;
		await checkStatusCodeByOptions(options, 401);
	});
});
