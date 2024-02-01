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
} = require('../common.js');

describe('Team', () => {
	let options,
		teamResponse,
		otherTeamResponse,
		joinRequestResponse,
		owner,
		ownerData,
		otherOwner,
		otherOwnerData,
		admin,
		adminData,
		editor,
		editorData,
		member,
		memberData,
		usedJoinedRequest,
		checkDeclinedData;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		owner = generateUserData();
		ownerData = await createItem(createUserPath, owner);

		otherOwner = generateUserData();
		otherOwnerData = await createItem(createUserPath, otherOwner);

		admin = generateUserData();
		adminData = await createItem(createUserPath, admin);

		editor = generateUserData();
		editorData = await createItem(createUserPath, editor);

		member = generateUserData();
		memberData = await createItem(createUserPath, member);

		let teamData = {
			name: makeUniqueString(),
			handle: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'private',
		};

		await login(owner.email, owner.rawPass);
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

		let otherTeamData = {
			name: makeUniqueString(),
			handle: makeUniqueString(),
			description: makeUniqueString(),
			visibility: 'private',
		};

		await login(otherOwner.email, otherOwner.rawPass);
		options.uri = signPath('/team', 'POST');
		otherTeamResponse = await createItem(options.uri, otherTeamData);

		checkDeclinedData = (declineJoinRequestResponse, joinRequest) => {
			expect(declineJoinRequestResponse.statusCode).to.equal(200);
			expect(declineJoinRequestResponse.body.data.status).to.equal('declined');
			expect(declineJoinRequestResponse.body.data.user_ref).to.equal(joinRequest.user.ref);
			expect(declineJoinRequestResponse.body.data.team_ref).to.equal(joinRequest.request.team_ref);
		};
	});

	describe('Decline Join Request', () => {
		beforeEach(async () => {
			options.method = 'POST';
			options.transform = null;
		});

		/* Positive tests */
		it('should be able to decline join requests with [owner]', async () => {
			let joinRequest = await generateJoinRequest(teamResponse.data.ref);
			await login(owner.email, owner.rawPass);
			options.uri = signPath(
				'/team/' + teamResponse.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let declineJoinRequestResponse = await request(options);
			checkDeclinedData(declineJoinRequestResponse, joinRequest);
			usedJoinedRequest = joinRequest;

			// Check that the user relation is not created
			await login(joinRequest.user.email, joinRequest.user.rawPass);
			options.method = 'GET';
			options.uri = signPath(`/team/${teamResponse.data.ref}`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should be able to decline join requests with [admin]', async () => {
			let joinRequest = await generateJoinRequest(teamResponse.data.ref);
			await login(admin.email, admin.rawPass);
			options.uri = signPath(
				'/team/' + teamResponse.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};

			let declineJoinRequestResponse = await request(options);
			checkDeclinedData(declineJoinRequestResponse, joinRequest);
			usedJoinedRequest = joinRequest;

			// Check that the user relation is not created
			await login(joinRequest.user.email, joinRequest.user.rawPass);
			options.method = 'GET';
			options.uri = signPath(`/team/${teamResponse.data.ref}`, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		/* Negative tests */
		it('should not be able to decline join request with [editor]', async () => {
			let joinRequest = await generateJoinRequest(teamResponse.data.ref);
			await login(editor.email, editor.rawPass);
			options.uri = signPath(
				'/team/' + teamResponse.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline join request with [member]', async () => {
			let joinRequest = await generateJoinRequest(teamResponse.data.ref);
			await login(member.email, member.rawPass);
			options.uri = signPath(
				'/team/' + teamResponse.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline join request that was already declined', async () => {
			await login(owner.email, owner.rawPass);
			options.uri = signPath(
				'/team/' + teamResponse.data.ref + '/decline/' + usedJoinedRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline invalid join request with invalid action ref', async () => {
			await login(owner.email, owner.rawPass);
			options.uri = signPath(
				'/team/' + teamResponse.data.ref + '/decline/' + makeUniqueString(),
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline invalid join request with invalid team', async () => {
			let joinRequest = await generateJoinRequest(teamResponse.data.ref);
			await login(owner.email, owner.rawPass);
			options.uri = signPath(
				'/team/' + makeUniqueString() + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to decline valid join request that has wrong team', async () => {
			let joinRequest = await generateJoinRequest(teamResponse.data.ref);
			await login(owner.email, owner.rawPass);
			options.uri = signPath(
				'/team/' + otherTeamResponse.data.ref + '/decline/' + joinRequest.request.ref,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
