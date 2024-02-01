const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	createItem,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	checkCreateStatusCode,
	checkStatusCodeByOptions,
	login,
	signPath,
} = require('../common.js');

describe('Team', () => {
	let options, teamResponse, creator, creatorData, joiner, joinerData;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		joiner = generateUserData();
		joinerData = await createItem(createUserPath, joiner);

		await login(creator.email, creator.rawPass);

		let teamData = {
			name: makeUniqueString(),
			handle: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'private',
		};

		options.uri = signPath('/team', 'POST');
		teamResponse = await createItem(options.uri, teamData);
	});

	describe('Join', () => {
		beforeEach(async () => {
			options.transform = null;
		});

		/* Positive tests */
		it('should be able to join', async () => {
			await login(joiner.email, joiner.rawPass);
			options.uri = signPath('/team/' + teamResponse.data.ref + '/join', 'POST');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			let response = await request(options);
			expect(response.statusCode).to.equal(200);
			expect(response.body.data.status).to.equal('pending');
			expect(response.body.data.user_ref).to.equal(joinerData.data.ref);
			expect(response.body.data.team_ref).to.equal(teamResponse.data.ref);
		});

		/* Negative tests */
		it('should not be able to request to join if already requested before', async () => {
			await login(joiner.email, joiner.rawPass);
			options.uri = signPath('/team/' + teamResponse.data.ref + '/join', 'POST');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to request join if already a member', async () => {
			await login(creator.email, creator.rawPass);
			options.uri = signPath('/team/' + teamResponse.data.ref + '/join', 'POST');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
