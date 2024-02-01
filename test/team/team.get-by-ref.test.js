const expect = require('chai').expect;
const request = require('request-promise');
const _pluck = require('lodash').map;

const {
	baseUrl,
	baseGetOptions,
	createItem,
	getItem,
	checkStatusCodeByOptions,
	checkForSuccess,
	generateUserData,
	makeUniqueString,
	makeRandomInt,
	login,
	signPath,
	likeOrFollowTeam,
	createTraditionalCollection,
	generateJoinRequest,
} = require('../common.js');

describe('Team', () => {
	let options,
		createUserPath,
		teams,
		team1Ref,
		team1Handle,
		team2Ref,
		team2Handle,
		teamData,
		checkProperData,
		creator,
		admin,
		editor,
		member,
		follower,
		liker,
		notRelatedUser,
		creatorData,
		adminData,
		editorData,
		memberData,
		followerData,
		likerData,
		notRelatedUserData;

	before(async () => {
		options = {...baseGetOptions};
		checkProperData = (relation, team) => {
			// Check for property existence
			expect(relation).to.not.have.property('id');
			expect(relation).to.have.property('name');
			expect(relation).to.have.property('handle');
			expect(relation).to.have.property('description');
			expect(relation).to.have.property('visibility');
			expect(relation).to.have.property('access');
			expect(relation).to.have.property('avatar');
			expect(relation).to.have.property('members');

			// Check for correct data type
			expect(relation.name).to.be.a('string');
			expect(relation.handle).to.be.a('string');
			expect(relation.description).to.be.a('string');
			expect(relation.visibility).to.be.a('string');
			expect(relation.access).to.be.a('string');
			expect(relation.members).to.be.a('array');

			// Check for value
			expect(relation.name).to.equal(team.name);
			expect(relation.handle).to.equal(team.handle.toLowerCase());
			expect(relation.description).to.equal(team.description);
			expect(relation.visibility).to.equal(team.visibility);
		};

		/*
			Synopsis:
			- Create different types of users, creator|admin|editor|member|follower|notrelated
			- Creator will create a team
			- Creator will add admin, editor, member and follower users to the team with their corresponding relation			
		*/

		/****** Create users *******/

		createUserPath = baseUrl + '/user';

		// Create team creator
		creator = generateUserData();
		creatorData = await createItem(createUserPath, creator);

		// Create team admin
		admin = generateUserData();
		adminData = await createItem(createUserPath, admin);

		// Create team editor
		editor = generateUserData();
		editorData = await createItem(createUserPath, editor);

		// Create team member
		member = generateUserData();
		memberData = await createItem(createUserPath, member);

		// Create team follower
		follower = generateUserData();
		followerData = await createItem(createUserPath, follower);

		// Create team like
		liker = generateUserData();
		likerData = await createItem(createUserPath, liker);

		// Create a user that is not related to the team in any way
		notRelatedUser = generateUserData();
		notRelatedUserData = await createItem(createUserPath, notRelatedUser);

		/****** Create Teams *******/

		// Simulate login the team creator
		await login(creator.email, creator.rawPass);

		// Generate a data for team 1 and team 2
		let str1 = makeUniqueString();
		let str2 = makeUniqueString();

		teamData = [
			{
				name: str1,
				description: 'team 1 description',
				visibility: 'hidden',
				handle: str1,
			},
			{
				name: str2,
				description: 'team 2 description',
				visibility: 'public',
				handle: str2,
			},
		];

		teams = [];

		// Create teams
		for (let data of teamData) {
			let response = await createItem(signPath('/team', 'POST'), data);
			teams.push(response.data);
		}

		team1Ref = teams[0].ref;
		team1Handle = teams[0].handle;

		team2Ref = teams[1].ref;
		team2Handle = teams[1].handle;

		/****** Create Relationships [admin, editor, member, follower, liker] *******/

		let addRelationPath = `/team/${teams[0].ref}/user`;

		// Add admin to team1
		await createItem(signPath(addRelationPath + '/' + adminData.data.ref, 'POST'), {
			relation: ['admin'],
		});

		// Add editor to team1
		await createItem(signPath(addRelationPath + '/' + editorData.data.ref, 'POST'), {
			relation: ['editor'],
		});

		// Add member to team1
		await createItem(signPath(addRelationPath + '/' + memberData.data.ref, 'POST'), {
			relation: ['member'],
		});
	});

	describe('get team by ref', () => {
		beforeEach(async () => {
			options.transform = null;
			options.uri = signPath('/team/' + team1Ref, 'GET');
		});

		/* Positive tests */
		it('should return correct success status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return proper data for team', async () => {
			let teams = await request(options);
			for (let i = 0; i < teams.length; i++) {
				checkProperData(teams[i], teamData[i]);
			}
		});

		it('should return all members related to each of the teams', async () => {
			let teams = await request(options);

			/*
				Since admin, editor, member were added to team1, therefore, there should be a total of four members including the creator of team			
			*/

			// Verify the number of members
			expect(teams.members.length).to.equal(4);

			// Make sure that correct members are returned
			const memberRefs = _pluck(teams.members, 'ref');
			expect(memberRefs.includes(creatorData.data.ref)).to.equal(true);
			expect(memberRefs.includes(adminData.data.ref)).to.equal(true);
			expect(memberRefs.includes(editorData.data.ref)).to.equal(true);
			expect(memberRefs.includes(memberData.data.ref)).to.equal(true);

			for (let i = 0; i < teams.length; i++) {
				checkProperData(teams[i], teamData[i]);
			}
		});

		it('should return all events hosted by each of the teams', async () => {
			/*
				Info: 
				- Create 3 events and make the team the host for each of the events
				- Get the team by ref
				- Make sure that the correct events are added to the response			
			*/

			await login(admin.email, admin.rawPass);
			options.uri = signPath('/team/' + team1Ref, 'GET');
			const eventA = await createTraditionalCollection({host: team1Ref});
			const eventB = await createTraditionalCollection({host: team1Ref});
			const eventC = await createTraditionalCollection({host: team1Ref});

			let team = await request(options);

			// Verify the number of members
			expect(team.hosted_events.length).to.equal(3);

			// Make sure that correct members are returned
			const hostedEventsRefs = _pluck(team.hosted_events, 'ref');
			expect(hostedEventsRefs.includes(eventA.data.ref)).to.equal(true);
			expect(hostedEventsRefs.includes(eventB.data.ref)).to.equal(true);
			expect(hostedEventsRefs.includes(eventC.data.ref)).to.equal(true);

			for (let i = 0; i < team.length; i++) {
				checkProperData(team[i], teamData[i]);
			}
		});

		it('should return all join requests for the team', async () => {
			/*
				Execute join requests using those 3 users
				Make sure that the join requests are correct
				Make sure that the join requestors are correct
			*/

			let userAJoinRequest = await generateJoinRequest(team1Ref);
			let userBJoinRequest = await generateJoinRequest(team1Ref);
			let userCJoinRequest = await generateJoinRequest(team1Ref);

			// Get team data by ref and make sure that join requests are included in the response data.
			await login(admin.email, admin.rawPass);
			options.uri = signPath('/team/' + team1Ref, 'GET');
			let team = await request(options);

			// Make sure that the join requests are correct
			const joinRequestsRefs = _pluck(team.join_requests, 'ref');
			expect(joinRequestsRefs.includes(userAJoinRequest.request.ref)).to.equal(true);
			expect(joinRequestsRefs.includes(userBJoinRequest.request.ref)).to.equal(true);
			expect(joinRequestsRefs.includes(userCJoinRequest.request.ref)).to.equal(true);

			// Make sure that the join requestors are correct
			const requestors = _pluck(team.join_requests, 'user');
			const requestorsRefs = _pluck(requestors, 'ref');
			expect(requestorsRefs.includes(userAJoinRequest.user.ref)).to.equal(true);
			expect(requestorsRefs.includes(userBJoinRequest.user.ref)).to.equal(true);
			expect(requestorsRefs.includes(userCJoinRequest.user.ref)).to.equal(true);
		});

		it('should return teams to admins', async () => {
			// Simulate login the team admin
			await login(admin.email, admin.rawPass);
			options.uri = signPath('/team/' + team1Ref, 'GET');

			let team = await request(options);
			checkProperData(team, teamData[0]);
		});

		it('should return teams to contibs', async () => {
			// Simulate login the team editor
			await login(editor.email, editor.rawPass);
			options.uri = signPath('/team/' + team1Ref, 'GET');

			let team = await request(options);
			checkProperData(team, teamData[0]);
		});

		it('should return teams to members', async () => {
			// Simulate login the team member
			await login(member.email, member.rawPass);
			options.uri = signPath('/team/' + team1Ref, 'GET');

			let team = await request(options);
			checkProperData(team, teamData[0]);
		});

		it('should not return teams to follower', async () => {
			// login liker and follow the team
			await login(follower.email, follower.rawPass);
			await likeOrFollowTeam('follow', team1Ref);

			options.uri = signPath('/team/' + team1Ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not return teams to liker', async () => {
			// login liker and like the team
			await login(liker.email, liker.rawPass);
			await likeOrFollowTeam('like', team1Ref);

			options.uri = signPath('/team/' + team1Ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not return teams to users that are not related to the team', async () => {
			// Simulate login the team notRelatedUser
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			options.uri = signPath('/team/' + team1Ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});

	describe('get team by @handle', () => {
		beforeEach(async () => {
			options.transform = null;
		});

		it('should return teams to admins', async () => {
			// Simulate login the team admin
			await login(admin.email, admin.rawPass);
			options.uri = signPath('/team/@' + team1Handle, 'GET');
			let team = await request(options);
			checkProperData(team, teamData[0]);
		});

		it('should return teams to contibs', async () => {
			// Simulate login the team editor
			await login(editor.email, editor.rawPass);
			options.uri = signPath('/team/@' + team1Handle, 'GET');

			let team = await request(options);
			checkProperData(team, teamData[0]);
		});

		it('should return teams to members', async () => {
			// Simulate login the team member
			await login(member.email, member.rawPass);
			options.uri = signPath('/team/@' + team1Handle, 'GET');

			let team = await request(options);
			checkProperData(team, teamData[0]);
		});

		it('should not return teams to follower', async () => {
			// login liker and follow the team
			await login(follower.email, follower.rawPass);
			await likeOrFollowTeam('follow', team1Ref);

			options.uri = signPath('/team/@' + team1Handle, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not return teams to liker', async () => {
			// login liker and like the team
			await login(liker.email, liker.rawPass);
			await likeOrFollowTeam('like', team1Ref);

			options.uri = signPath('/team/@' + team1Handle, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return teams to users that are not related to the team if team is public', async () => {
			// Simulate login the team notRelatedUser
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			options.uri = signPath('/team/@' + team2Handle, 'GET'); //use team2Handle where team2 is public
			await checkStatusCodeByOptions(options, 200);
		});

		it('should not return teams to users that are not related to the team if team is not public', async () => {
			// Simulate login the team notRelatedUser
			await login(notRelatedUser.email, notRelatedUser.rawPass);
			options.uri = signPath('/team/@' + team1Handle, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
