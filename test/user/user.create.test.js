const expect = require('chai').expect;
const request = require('request-promise');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
const {
	baseUrl,
	basePostOptions,
	makeRandomInt,
	createItem,
	checkCreateStatusCode,
	checkForSuccess,
	signPath,
	login,
	checkUserPlan,
} = require('../common.js');

const makeUniqueString = () => {
	let text = '';
	let possible = '_abcdefghijklmnopqrstuvwxyz0123456789';
	let curtime = Date.now();
	for (let i = 0; i < 38; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
	return curtime + text;
};

const generateUserData = () => {
	const email = 'email_' + makeUniqueString() + '@ntbl-api.com';
	const password = '1q1q';
	const wine_knowledge = 'wine_collector';

	let payload = getAuthCreationPayload(password, email, wine_knowledge);
	payload['wine_knowledge'] = wine_knowledge;

	return payload;
};

describe('User', () => {
	describe('create', () => {
		let options, path, baseData, tastingResponse;

		before(async () => {
			options = {...basePostOptions};
			path = baseUrl + '/user';
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
		});

		it('should return correct status code', async () => {
			let response = await createItem(path, generateUserData(), true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful', async () => {
			let response = await createItem(path, generateUserData());
			checkForSuccess(response);
		});

		it('should return proper data', async () => {
			let response = await createItem(path, generateUserData());

			expect(response).have.property('data');
			expect(response.data).to.not.have.property('id');
			expect(response.data).to.have.property('ref');
			expect(response.data).to.have.property('wine_knowledge');
			expect(response.data).to.have.property('specs');

			expect(response.data).to.be.an('object');
			expect(response.data.ref).to.be.a('string');
			expect(response.data.wine_knowledge).to.be.a('string');
			expect(response.data.specs).to.be.an('object');
		});

		it('should create an actual rows in db', async () => {
			let data = generateUserData();
			data.name = makeUniqueString();
			data.handle = makeUniqueString();

			let response = await createItem(path, data);
			let ref = response.data.ref;

			// Test response first
			expect(response).to.have.property('data');
			expect(response.data).to.not.have.property('id');
			expect(ref).to.be.a('string').that.have.lengthOf.above(0);

			await login(data.email, '1q1q');
			options.method = 'GET';
			options.uri = signPath('/raw/identity/' + ref);
			let user = await request(options);

			// Check if user response has the right properties
			expect(user).to.have.property('id');
			expect(user).to.have.property('ref');
			expect(user).to.have.property('handle');
			expect(user).to.have.property('name');
			expect(user).to.have.property('email');
			expect(user).to.have.property('hpass');
			expect(user).to.have.property('salt');
			expect(user).to.have.property('iterations');
			expect(user).to.have.property('created_at');
			expect(user).to.have.property('updated_at');

			// Check if user response fields has the right values
			expect(user.ref).to.equal(ref);
			expect(user.name).to.equal(data.name);
			expect(user.handle).to.equal(data.handle);
			expect(user.email).to.equal(data.email);
			expect(user.hpass).to.not.equal(data.hpass);
		});

		it('should have [subscribe] subscription and [new] status by default', async () => {
			let response = await createItem(path, generateUserData());
			let subscription = response.data.subscription;
			checkUserPlan(subscription);
			expect(subscription.active_plan).to.equal('subscribe');
			expect(subscription.future_plan).to.equal('');
			expect(subscription.status).to.equal('new');
		});

		it('should lowercase and trim emails', async () => {
			let data = generateUserData();
			data.email = `    ${data.email.toUpperCase()}   `; // set the email to upper case and add spaces to it
			let response = await createItem(path, data);

			// The original uppercased version of the email must to be equal to the returned, lowercased version of the email
			expect(data.email).to.not.equal(response.data.email);

			// Make sure that the lowercased, original email must be equal to the returned email
			expect(data.email.toLowerCase()).to.not.equal(response.data.email);

			checkForSuccess(response);
		});

		it('should be successful if name has single-quotes', async () => {
			let data = generateUserData();
			data.name = "'" + makeUniqueString() + "'" + makeUniqueString() + "'";

			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should be successful if name is missing in payload', async () => {
			let data = generateUserData(); // generateUserData doesn't include name by default
			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should be successful if name is empty', async () => {
			let data = generateUserData();
			data.name = '';

			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should be successful if name is null', async () => {
			let data = generateUserData();
			data.name = null;

			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should be successful if wine_knowledge is empty', async () => {
			let data = generateUserData();
			data.wine_knowledge = '';

			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should be successful if wine_knowledge is null', async () => {
			let data = generateUserData();
			data.wine_knowledge = null;

			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should be successful even with [trimmable] characters in fields', async () => {
			let data = generateUserData();
			data.name = '\ntest name\n';
			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should return an error if name has two or more successive single-quotes', async () => {
			let data = generateUserData();
			data.name = "'" + makeUniqueString() + "''" + makeUniqueString() + "'''";
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if name has illegal chars', async () => {
			let data = generateUserData();
			data.name = 'name!@#$%&^*()=+';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if name exceed max chars', async () => {
			let data = generateUserData();
			data.name = makeUniqueString().repeat(5) + 'a';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should be successful if handle is missing in payload', async () => {
			let data = generateUserData(); // generateUserData doesn't include handle by default
			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should be successful if handle is empty', async () => {
			let data = generateUserData();
			data.handle = '';
			let response = await createItem(path, data);
			checkForSuccess(response);
		});

		it('should return an error if handle has illegal chars', async () => {
			let data = generateUserData();
			data.handle = 'handle_!@#$%&^*()=+';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if handle exceed max chars', async () => {
			let data = generateUserData();
			data.handle = makeUniqueString().repeat(5) + 'a';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email is missing in payload', async () => {
			let data = generateUserData();
			delete data.email;
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email is empty', async () => {
			let data = generateUserData();
			data.email = '';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email has single quotes', async () => {
			let data = generateUserData();
			data.email = "'email_'@ntbl-api.com";
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email has double quotes', async () => {
			let data = generateUserData();
			data.email = '"email_"@ntbl-api.com';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email has illegal chars', async () => {
			let data = generateUserData();
			data.email = 'email_!@#$%&^*()=+@ntbl-api.com';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email exceed max chars', async () => {
			let data = generateUserData();
			data.email = makeUniqueString().repeat(5) + '@ntbl-api.com';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email has invalid format', async () => {
			let data = generateUserData();
			data.email = 'this_is_not_a_valid_email';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if hpass is missing in payload', async () => {
			let data = generateUserData();
			delete data.hpass;
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if hpass is empty', async () => {
			let data = generateUserData();
			data.hpass = '';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if hpass exceed max chars', async () => {
			let data = generateUserData();
			data.hpass = makeUniqueString().repeat(5) + 'a';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if wine_knowledge exceed max chars', async () => {
			let data = generateUserData();
			data.wine_knowledge = makeUniqueString().repeat(16) + 'a';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if wine_knowledge is a non existing key', async () => {
			let data = generateUserData();
			data.wine_knowledge = makeUniqueString(16);
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if wine_knowledge is an object', async () => {
			let data = generateUserData();
			data.wine_knowledge = {
				title_key: 'wine_collector',
				description: 'Collector of Winess',
				role: 'Wine Collector',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if wine_knowledge is an array', async () => {
			let data = generateUserData();
			data['wine_knowledge'] = ['wine_collector', 'Collector of Winess', 'Wine Collector'];
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if wine_knowledge is a number', async () => {
			let data = generateUserData();
			data.wine_knowledge = makeRandomInt();
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if wine_knowledge is a bool', async () => {
			let data = generateUserData();
			data.wine_knowledge = true;
			await checkCreateStatusCode(path, data, 400);
		});
	});
});
