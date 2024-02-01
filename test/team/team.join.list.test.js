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
	generateJoinRequest,
	createContest,
	generateJoinContestRequest,
} = require('../common.js');

describe('Team', () => {
	let options,
		teamResponse,
		otherTeamResponse,
		joinRequest,
		user,
		userData,
		owner,
		ownerData,
		otherOwner,
		otherOwnerData,
		admin,
		adminData,
		editor,
		editorData,
		member,
		memberData;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		owner = generateUserData();
		ownerData = await createItem(createUserPath, owner);

		admin = generateUserData();
		adminData = await createItem(createUserPath, admin);

		editor = generateUserData();
		editorData = await createItem(createUserPath, editor);

		member = generateUserData();
		memberData = await createItem(createUserPath, member);

		await login(owner.email, owner.rawPass);
		let teamData = {
			name: makeUniqueString(),
			handle: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'private',
		};
		options.uri = signPath('/team', 'POST');
		teamResponse = await createItem(options.uri, teamData);

		let addRelationPath = `/team/${teamResponse.data.ref}/user`;
		await createItem(signPath(addRelationPath + '/' + adminData.data.ref, 'POST'), {
			relation: ['admin'],
		});
		await createItem(signPath(addRelationPath + '/' + editorData.data.ref, 'POST'), {
			relation: ['editor'],
		});
		await createItem(signPath(addRelationPath + '/' + memberData.data.ref, 'POST'), {
			relation: ['member'],
		});

		joinRequest = await generateJoinRequest(teamResponse.data.ref);
	});

	describe('Join Request List', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
		});

		/* Positive tests */
		it('should be able to list join request when logged in as [owner]', async () => {
			await login(owner.email, owner.rawPass);
			options.uri = signPath('/team/' + teamResponse.data.ref + '/join/pending', 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			let pendingData = response.body[0];
			expect(response.statusCode).to.equal(200);
			expect(pendingData.status).to.equal('pending');
			expect(pendingData.user.ref).to.equal(joinRequest.user.ref);
			expect(pendingData.team.ref).to.equal(teamResponse.data.ref);
		});

		it('should be able to list join request when logged in as [admin]', async () => {
			await login(admin.email, admin.rawPass);
			options.uri = signPath('/team/' + teamResponse.data.ref + '/join/pending', 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			let pendingData = response.body[0];
			expect(response.statusCode).to.equal(200);
			expect(pendingData.status).to.equal('pending');
			expect(pendingData.user.ref).to.equal(joinRequest.user.ref);
			expect(pendingData.user.name).to.equal(joinRequest.user.name);
			expect(pendingData.team.ref).to.equal(teamResponse.data.ref);
		});

		it('should include NOT user.email if accessed by a [traditional] team', async () => {
			await login(admin.email, admin.rawPass);
			options.uri = signPath('/team/' + teamResponse.data.ref + '/join/pending', 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			let pendingData = response.body[0];
			expect(response.statusCode).to.equal(200);
			expect(pendingData.status).to.equal('pending');
			expect(pendingData.user.ref).to.equal(joinRequest.user.ref);
			expect(pendingData.user.name).to.equal(joinRequest.user.name);
			expect(pendingData.team.ref).to.equal(teamResponse.data.ref);

			// Make sure that the user_email is NOT included for traditional team
			expect(pendingData.user).to.not.have.property('user.email');
		});

		it('should include user.email if accessed by a [contest] team', async () => {
			await login(admin.email, admin.rawPass);

			// Create a test contest
			let contest = await createContest();
			let contestRef = contest.data.ref;

			// Generate a join request
			let joinRequest = await generateJoinContestRequest(contestRef, 'participant');
			let requestor = joinRequest.user;

			// Login the admin again.
			await login(admin.email, admin.rawPass);

			// Access the join request list API using the contest
			options.uri = signPath('/team/' + contestRef + '/join/pending', 'GET');
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let response = await request(options);
			let pendingData = response.body[0];
			expect(response.statusCode).to.equal(200);
			expect(pendingData.status).to.equal('pending');
			expect(pendingData.user.ref).to.equal(requestor.ref);
			expect(pendingData.user.name).to.equal(requestor.name);
			expect(pendingData.team.ref).to.equal(contestRef);

			// Make sure that the user_email is included
			expect(pendingData.user).to.have.property('email');
			expect(pendingData.user.email).to.equal(requestor.email);
		});

		/* Negative tests */
		it('should not be able to list join request when logged in as [editor]', async () => {
			await login(editor.email, editor.rawPass);
			options.uri = signPath('/team/' + teamResponse.data.ref + '/join/pending', 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to list join request when logged in as [member]', async () => {
			await login(member.email, member.rawPass);
			options.uri = signPath('/team/' + teamResponse.data.ref + '/join/pending', 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to list join request when logged in as [no relation]', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath('/team/' + teamResponse.data.ref + '/join/pending', 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
