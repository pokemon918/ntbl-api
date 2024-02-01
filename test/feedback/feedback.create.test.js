const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	login,
	signPath,
	createItem,
	checkCreateStatusCode,
	checkForSuccess,
	checkProperData,
	generateUserData,
	makeUniqueString,
} = require('../common.js');

describe('Feedback', () => {
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

	describe('create', () => {
		let options, path, testFeedbackData, feedbackResponse, checkProperData;

		before(async () => {
			options = {...basePostOptions};
			path = signPath('/feedback', 'POST');
			testFeedbackData = {
				name: 'Test Name',
				email: 'test@ntbl-api.com',
				message: 'This is a message',
			};

			feedbackResponse = await createItem(path, testFeedbackData);

			checkProperData = (feedback, testFeedbackData) => {
				// Check for property existence
				expect(feedback).to.not.have.property('id');
				expect(feedback).to.have.property('name');
				expect(feedback).to.have.property('email');
				expect(feedback).to.have.property('message');

				// Check for correct data type
				expect(feedback.name).to.be.a('string');
				expect(feedback.email).to.be.a('string');
				expect(feedback.message).to.be.a('string');

				// Check for value
				expect(testFeedbackData.name).to.equal(feedback.name);
				expect(testFeedbackData.email).to.equal(feedback.email);
				expect(testFeedbackData.message).to.equal(feedback.message);
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			path = signPath('/feedback', 'POST');
		});

		it('should return correct data', async () => {
			checkProperData(feedbackResponse.data.feedback, testFeedbackData);
		});

		it('should return correct status code', async () => {
			let response = await createItem(path, testFeedbackData, true);
			expect(response.statusCode).to.equal(200);
		});

		it('should be successful', async () => {
			checkForSuccess(feedbackResponse);
		});

		it('should be successful if message is equal to max(4000)-1 chars', async () => {
			let data = {
				name: 'Test Tasting',
				email: 'test@ntbl-api.com',
				message: 'a'.repeat(4000 - 1),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		it('should be successful if message is equal to max(4000) chars', async () => {
			let data = {
				name: 'Test Tasting',
				email: 'test@ntbl-api.com',
				message: 'a'.repeat(4000),
			};

			let tastingResponse = await createItem(path, data);
			checkForSuccess(tastingResponse);
		});

		/* Negative Tests */

		it('should return an error if payload is empty', async () => {
			let data = {};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if name is empty', async () => {
			let data = {...testFeedbackData};
			data.name = '';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if name is missing in the payload', async () => {
			let data = {...testFeedbackData};
			delete data.name;
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if name exceeds max chars (255)', async () => {
			let data = {...testFeedbackData};
			data.name = 'a'.repeat(255 + 1);
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email is empty', async () => {
			let data = {...testFeedbackData};
			data.email = '';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email is missing in payload', async () => {
			let data = {...testFeedbackData};
			delete data['email'];
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email has illegal chars', async () => {
			let data = {name: 'test name', message: 'this is a message'};
			data.email = 'email_!@#$%&^*()=+@ntbl-api.com';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email exceed max chars', async () => {
			let data = {name: 'test name', message: 'this is a message'};
			data.email = 'a'.repeat(255) + '@ntbl-api.com';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if email has invalid format', async () => {
			let data = {name: 'test name', message: 'this is a message'};
			data.email = 'this_is_not_a_valid_email';
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if message is empty', async () => {
			let data = {message: ''};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if message exceed max(4000) chars', async () => {
			let data = {
				name: 'Test Tasting',
				email: 'test@ntbl-api.com',
				message: 'a'.repeat(4000 + 1),
			};
			await checkCreateStatusCode(path, data, 400);
		});

		// todo: Once core-93 is merged (has some changes about how long text handle non-print and html) add some tests related to non-print and html
	});
});
