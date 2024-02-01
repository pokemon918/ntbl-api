const expect = require('chai').expect;
const request = require('request-promise');
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const invalidFileExts = ['.txt', '.pdf', '.html', '.xml', '.exe', '.gif'];
const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	generateJoinContestRequest,
	approveJoinRequest,
	createDivisionMemberWithRole,
	getContest,
	createContest,
	createContestDivision,
	createContestCollection,
	createContestParticipant,
	assignContestCollectionToDivision,
	importImpressionsForContestCollection,
	createTraditionalImpression,
	createTraditionalTeam,
	createTraditionalCollection,
} = require('../common.js');

describe('Contest', () => {
	let options,
		user,
		userData,
		contestAdmin,
		contestAdminData,
		divisionLeader,
		divisionMember,
		participant,
		contestTeam,
		divisionTeam,
		originalContestData;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		// Create team contestAdmin
		contestAdmin = generateUserData();
		let contestAdminData = await createItem(createUserPath, contestAdmin);

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		// Simulate login
		await login(contestAdmin.email, contestAdmin.rawPass);

		// Create Contest Team
		contestTeam = await createContest();

		// Create Division
		divisionTeam = await createContestDivision(contestTeam.data.ref);

		// Create Participant and Assign Leader Role
		divisionLeader = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			divisionTeam,
			'leader'
		);

		// Create Participant and Assign Member Role
		divisionMember = await createDivisionMemberWithRole(
			contestAdmin,
			contestTeam,
			divisionTeam,
			'member'
		);

		// Create Participant without a Division and Role
		participant = await createContestParticipant(contestAdmin, contestTeam.data.ref, 'participant');
	});

	describe('Update', () => {
		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.body = {
				name: makeUniqueString(),
				description: makeUniqueString(),
				handle: makeUniqueString(),
			};
			options.uri = signPath(`/team/${contestTeam.data.ref}`, 'POST');
		});

		/* Positive tests */

		it('should return proper data', async () => {
			let response = await request(options);
			expect(response.status).to.equal('success');

			// Response data should be the same as the update source data
			expect(response.data.name).to.equal(options.body.name);
			expect(response.data.handle).to.equal(options.body.handle);
			expect(response.data.description).to.equal(options.body.description);

			// Response data should NOT be the same as the original data since they were already updated
			expect(response.data.name).to.not.equal(contestTeam.data.name);
			expect(response.data.handle).to.not.equal(contestTeam.data.handle);
			expect(response.data.description).to.not.equal(contestTeam.data.description);

			expect(response.data.type).to.equal('contest');
		});

		/* Negative tests */

		it('should return an error if [name] is sent as a numeric value', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				name: 1234,
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [name] is sent as an array', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				name: [],
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [name] is sent as an object', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				name: {},
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [name] exceeded max length of [255]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				name: makeUniqueString(256),
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [handle] is sent as a numeric value', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				handle: 1234,
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [handle] is sent as an array', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				handle: [],
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [handle] is sent as an object', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				handle: {},
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [handle] exceeded max length of [255]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				handle: makeUniqueString(256),
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [handle] does not have a valid handle format', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				handle: '$@#!@#%',
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [description] is sent as a numeric value', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				description: 1234,
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [description] is sent as an array', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				description: [],
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [description] is sent as an object', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				description: {},
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [description] exceeded max length of [4000]', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.body = {
				description: makeUniqueString(4001),
			};
			options.uri = signPath('/team/' + contestTeam.data.ref, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the contest ref is invalid', async () => {
			await login(contestAdmin.email, contestAdmin.rawPass);
			options.uri = signPath(`/team/${makeUniqueString()}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is not a participant', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(`/team/${contestTeam.data.ref}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is an [unassigned participant]', async () => {
			await login(participant.email, participant.rawPass);
			options.uri = signPath(`/team/${contestTeam.data.ref}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is a [division leader]', async () => {
			await login(divisionLeader.email, divisionLeader.rawPass);
			options.uri = signPath(`/team/${contestTeam.data.ref}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the user is a [division member]', async () => {
			await login(divisionMember.email, divisionMember.rawPass);
			options.uri = signPath(`/team/${contestTeam.data.ref}`, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
