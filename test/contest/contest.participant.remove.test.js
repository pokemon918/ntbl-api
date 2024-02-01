const expect = require('chai').expect;
const request = require('request-promise');

const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	checkStatusCodeByOptions,
	login,
	signPath,
	getContest,
	createContest,
	createContestDivision,
	createDivisionMemberWithRole,
	createTraditionalTeam,
} = require('../common.js');

describe('Contest', () => {
	let options,
		creator,
		creatorData,
		user,
		userData,
		contestTeam,
		traditionalTeam,
		member,
		division,
		anotherDivision;

	before(async () => {
		options = {...basePostOptions};
		let createUserPath = baseUrl + '/user';

		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		user = generateUserData();
		userData = await createItem(createUserPath, user);

		await login(creator.email, creator.rawPass);

		// Create Contest Team
		contestTeam = await createContest();

		// Create Division
		division = await createContestDivision(contestTeam.data.ref);

		// Create Member
		member = await createDivisionMemberWithRole(creator, contestTeam, division, 'member');

		// Create Another Division
		anotherDivision = await createContestDivision(contestTeam.data.ref);

		// Create Traditional Team
		traditionalTeam = await createTraditionalTeam();
	});

	describe('Remove Participant', () => {
		beforeEach(async () => {
			options.method = 'POST';
			options.transform = null;
			options.body = {};
		});

		/* Positive tests */
		it('should be successful and return proper data', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/remove/${member.ref}/from/${division.ref}`,
				'POST'
			);

			let response = await request(options);
			expect(response.status).to.equal('success');

			let updatedContest = await getContest(contestTeam.data.ref);
			let participants = updatedContest.data.participants;
			let isRemoved = true;

			// Check participant data
			for (let i = 0; i < participants.length; i++) {
				if (participants[i].ref == member.ref && participants[i].division == division.ref) {
					isRemoved = false;
				}
			}
			expect(isRemoved).to.equal(true);
		});

		/* Negative tests */

		it('should not be able to remove from a division it has no relations to (repeated request)', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/remove/${member.ref}/from/${division.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove from a division it has no relations to', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/remove/${member.ref}/from/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove from a traditional team', async () => {
			options.uri = signPath(
				`/contest/${traditionalTeam.data.ref}/remove/${member.ref}/from/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove from invalid contest', async () => {
			options.uri = signPath(
				`/contest/${makeUniqueString()}/remove/${member.ref}/from/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove an invalid participant', async () => {
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/remove/${makeUniqueString()}/from/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to remove using a non-authorized user', async () => {
			await login(user.email, user.rawPass);
			options.uri = signPath(
				`/contest/${contestTeam.data.ref}/remove/${member.ref}/from/${anotherDivision.ref}`,
				'POST'
			);
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
