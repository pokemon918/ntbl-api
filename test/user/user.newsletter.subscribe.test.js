const expect = require('chai').expect;
const request = require('request-promise');
const _pluck = require('lodash').map;
const {
	baseUrl,
	baseGetOptions,
	createItem,
	makeUniqueString,
	login,
	signPath,
	generateUserData,
} = require('../common.js');
const dotenv = require('dotenv').config();

describe('User', () => {
	describe('Subscribe to Newsletter', () => {
		let options, baseUserPath, user, userData, autoSubscribe, checkSubscription, hasCredentials;

		before(async () => {
			options = {...baseGetOptions};
			baseUserPath = baseUrl + '/user';
			autoSubscribe = process.env.MAILCHIMP_ON_SIGNUP;
			hasCredentials = false;
			let hasApiKey = typeof process.env.MAILCHIMP_API_KEY !== 'undefined';
			let hasListId = typeof process.env.MAILCHIMP_LIST_ID !== 'undefined';

			// Pipeline Health or if we are tweaking mailchimp .env values
			if (hasApiKey && hasListId) {
				// We Presumably Failed when the test is skipped
				hasCredentials = true;
			}

			// Create user
			user = generateUserData();
			user.name = makeUniqueString();
			user.handle = makeUniqueString();
			user.voucher = 'UB001';
			userData = await createItem(baseUserPath, user);
			user.ref = userData.data.ref;
			await login(user.email, user.rawPass);

			checkSubscription = (response) => {
				// Check for property existence
				expect(response).to.have.property('email');
				expect(response).to.have.property('merge_fields');
				expect(response).to.have.property('status');
				expect(response).to.have.property('timestamp_opt');
				expect(response).to.have.property('last_changed');
				expect(response).to.have.property('tags');

				// Check for mailchimp values
				expect(response.email).to.equal(user.email);
				expect(response.merge_fields.FNAME).to.equal(user.name);
				//expect(response.merge_fields.FULLNAME).to.equal(user.name);
				//expect(response.merge_fields.USER_REF).to.equal(userData.data.ref);
				//expect(_pluck(response.tags, 'name').includes(user.voucher)).to.equal(true);
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath('/admin/newsletter/subscribe', 'POST');
		});

		it('should be already subscribed when auto subscribed', async () => {
			if (autoSubscribe == 'true') {
				options.method = 'GET';
				options.uri = signPath('/admin/newsletter', 'GET');
				options.transform = (body, response, resolveWithFullResponse) => {
					return response;
				};

				let response = await request(options);
				expect(response.statusCode).to.equal(200);
				checkSubscription(response.body);
			}
		});

		it('should return proper data when subscribing', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			let response = await request(options);
			expect(response.statusCode).to.equal(200);
			checkSubscription(response.body.data);
		});

		it('should return correct status code when checking', async () => {
			options.method = 'GET';
			options.uri = signPath('/admin/newsletter', 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			expect(response.statusCode).to.equal(200);
			checkSubscription(response.body);
		});

		it('should continue the [signup] if [mailchimp] is not reachable', async () => {
			// Regardless if we have credentials or not , any mailchimp related failure
			// api keys , list id , third party is down , the signup should go on
			let anotherUser = generateUserData();
			anotherUser.name = makeUniqueString();
			anotherUser.handle = makeUniqueString();
			let anotherUserData = await createItem(baseUserPath, anotherUser, true);
			expect(anotherUserData.statusCode).to.equal(201);
			expect(anotherUserData.body.data).to.have.property('ref');
		});
	});
});
