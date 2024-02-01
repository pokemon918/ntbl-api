const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const request = require('request-promise');
import {error, dump, info, warn, success} from '../../../vendor/printit (use throwlog instead)';

const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	generateJoinContestRequest,
	approveJoinRequest,
	createDivisionMemberWithRole,
	checkStatusCodeByOptions,
	login,
	signPath,
} = require('../../test/common.js');

let collectionA,
	collectionAImpressionA,
	collectionAImpressionB,
	collectionB,
	collectionBImpressionA,
	collectionBImpressionB,
	collectionC,
	collectionCImpressionA,
	collectionCImpressionB;

async function init() {
	let debug = false;
	let options;
	let createUserPath = baseUrl + '/user';
	let contestAdmin = generateUserData({voucher: 'scholar123'});
	let contestAdminData = await createItem(createUserPath, contestAdmin);

	await login(contestAdmin.email, contestAdmin.rawPass);
	options = {...basePostOptions};

	success('Creating contest');
	options.uri = signPath('/contest/new', 'POST');
	options.body = {
		name: 'Sommelier Wine Awards 2020',
		description:
			"The Sommelier Wine Awards is Britain's only on-trade wine competition, we focus entirely on wines aimed at the on-trade.",
		handle: 'swa' + (+new Date() % 100000),
		alias: {
			admin: 'Head judge',
			leader: 'Team leader',
			guide: 'Senior judge',
			member: 'Judge',
			collection: 'Flight',
			theme: 'Category',
		},
	};

	let contest = await request(options);

	dump(contest);

	warn('Password for all users: 1q1q');

	info('Team A');
	options.uri = signPath('/contest/' + contest.data.ref + '/add/team', 'POST');
	options.body = {
		name: 'Team one',
		description: '...',
	};
	let teamAResponse = await request(options);
	let teamA = teamAResponse.data.teams[0];
	let teamALeader = await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'leader');
	let teamAMemberA = await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'guide');
	let teamAMemberB = await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');

	info('Team B');
	options.uri = signPath('/contest/' + contest.data.ref + '/add/team', 'POST');
	options.body = {
		name: 'Team two',
		description: '...',
	};
	let teamBResponse = await request(options);
	let teamB = teamBResponse.data.teams[1];
	let teamBLeader = await createDivisionMemberWithRole(contestAdmin, contest, teamB, 'leader');
	let teamBMemberA = await createDivisionMemberWithRole(contestAdmin, contest, teamB, 'guide');
	let teamBMemberB = await createDivisionMemberWithRole(contestAdmin, contest, teamB, 'member');

	info('Team C');
	options.uri = signPath('/contest/' + contest.data.ref + '/add/team', 'POST');
	options.body = {
		name: 'Team three',
		description: '...',
	};
	let teamCResponse = await request(options);
	let teamC = teamCResponse.data.teams[2];
	let teamCLeader = await createDivisionMemberWithRole(contestAdmin, contest, teamC, 'leader');
	let teamCMemberA = await createDivisionMemberWithRole(contestAdmin, contest, teamC, 'guide');
	let teamCMemberB = await createDivisionMemberWithRole(contestAdmin, contest, teamC, 'member');

	info('Collection A');
	options.uri = signPath('/contest/' + contest.data.ref + '/add/collection', 'POST');
	options.body = {
		name: 'Round 1: Sauvignon Blanc - White',
		description: '',
		theme: 'Sauvignon Blanc - white - assorted countries',
		metadata: '{"medal_page":false,"swa_round_2":false,"tastingType":"swa20"}',
	};
	let collectionAResponse = await request(options);
	collectionA = collectionAResponse.data.collections[0];

	info('Import Wines into Collection A');
	//let filePath = np.join(__dirname, './data/collection_a_impressions.json');
	let filePath = np.join(__dirname, './oundauvignonlanc-white-assortedcountrieseam.json');
	let fileName = np.basename(filePath);
	let type = mime.contentType(fileName);
	let file = fs.createReadStream(filePath);

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionA.ref}/import/impressions`,
		'POST'
	);

	delete options.body;
	options.formData = {
		uploadedFile: {
			value: file,
			options: {
				filename: fileName,
				contentType: type,
			},
		},
	};

	let fileStream = fs.readFileSync(filePath, 'utf8');
	let importData = JSON.parse(fileStream);

	let collectionAImpressions = await request(options);
	collectionAImpressionA = collectionAImpressions.data.impressions[0];
	collectionAImpressionB = collectionAImpressions.data.impressions[1];
	delete options.formData;

	info('Collection B');
	options.uri = signPath('/contest/' + contest.data.ref + '/add/collection', 'POST');
	options.body = {
		name: 'Round 2: Rhone whites (France)',
		description: '',
		theme: 'Rhone - white - France',
		metadata: '{"medal_page":true,"swa_round_2":true,"tastingType":"swa20"}',
	};
	let collectionBResponse = await request(options);
	collectionB = collectionBResponse.data.collections[1];

	info('Import Wines into Collection B');
	filePath = np.join(__dirname, './data/collection_b_impressions.json');
	filePath = np.join(__dirname, './oundauvignonlanc-white-assortedcountrieseam.json');

	fileName = np.basename(filePath);
	type = mime.contentType(fileName);
	file = fs.createReadStream(filePath);

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionB.ref}/import/impressions`,
		'POST'
	);

	delete options.body;
	options.formData = {
		uploadedFile: {
			value: file,
			options: {
				filename: fileName,
				contentType: type,
			},
		},
	};

	fileStream = fs.readFileSync(filePath, 'utf8');
	importData = JSON.parse(fileStream);

	let collectionBImpressions = await request(options);
	collectionBImpressionA = collectionBImpressions.data.impressions[0];
	collectionBImpressionB = collectionBImpressions.data.impressions[1];
	delete options.formData;

	info('Collection C');
	options.uri = signPath('/contest/' + contest.data.ref + '/add/collection', 'POST');
	options.body = {
		name: 'Round 1: Shiraz and Shiraz blends - red (Australia)',
		description: '',
		theme: 'Shiraz & Shiraz blends - red - Australia',
		metadata: '{"medal_page":false,"swa_round_2":false,"tastingType":"swa20"}',
	};
	let collectionCResponse = await request(options);
	collectionC = collectionCResponse.data.collections[2];

	info('Import Wines into Collection C');
	filePath = np.join(__dirname, './data/collection_c_impressions.json');
	fileName = np.basename(filePath);
	type = mime.contentType(fileName);
	file = fs.createReadStream(filePath);

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionC.ref}/import/impressions`,
		'POST'
	);

	delete options.body;
	options.formData = {
		uploadedFile: {
			value: file,
			options: {
				filename: fileName,
				contentType: type,
			},
		},
	};

	fileStream = fs.readFileSync(filePath, 'utf8');
	importData = JSON.parse(fileStream);

	let collectionCImpressions = await request(options);
	collectionCImpressionA = collectionCImpressions.data.impressions[0];
	collectionCImpressionB = collectionCImpressions.data.impressions[1];
	delete options.formData;

	info('Assign Collection A into Divisions A,B,C');
	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionA.ref}/assign/${teamA.ref}`,
		'POST'
	);
	await request(options);

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionA.ref}/assign/${teamB.ref}`,
		'POST'
	);
	await request(options);

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionA.ref}/assign/${teamC.ref}`,
		'POST'
	);
	await request(options);

	info('Assign Collection B into Divisions A,B,C');
	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionB.ref}/assign/${teamA.ref}`,
		'POST'
	);
	await request(options);

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionB.ref}/assign/${teamB.ref}`,
		'POST'
	);
	await request(options);

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionB.ref}/assign/${teamC.ref}`,
		'POST'
	);
	await request(options);

	info('Assign Collection C into Divisions A,B,C');
	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionC.ref}/assign/${teamA.ref}`,
		'POST'
	);
	await request(options);

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionC.ref}/assign/${teamB.ref}`,
		'POST'
	);
	await request(options);

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionC.ref}/assign/${teamC.ref}`,
		'POST'
	);
	await request(options);

	info('Generate users requesting to become contest admins');
	let joinRequest = await generateJoinContestRequest(contest.data.ref, 'admin');
	let adminRequestA = {
		email: joinRequest.user.email,
		actionRef: joinRequest.request.ref,
	};

	joinRequest = await generateJoinContestRequest(contest.data.ref, 'admin');
	let adminRequestB = {
		email: joinRequest.user.email,
		actionRef: joinRequest.request.ref,
	};

	info('Generate users requesting to become participants');
	joinRequest = await generateJoinContestRequest(contest.data.ref, 'participant');
	let participantRequestA = {
		email: joinRequest.user.email,
		actionRef: joinRequest.request.ref,
	};

	joinRequest = await generateJoinContestRequest(contest.data.ref, 'participant');
	let participantRequestB = {
		email: joinRequest.user.email,
		actionRef: joinRequest.request.ref,
	};

	info('Unassigned Participants (No Division Team)');
	joinRequest = await generateJoinContestRequest(contest.data.ref, 'participant');
	let approveRequest = await approveJoinRequest(
		contestAdmin,
		contest.data.ref,
		joinRequest.request.ref
	);
	let unassignedParticipantA = joinRequest.user;

	joinRequest = await generateJoinContestRequest(contest.data.ref, 'participant');
	approveRequest = await approveJoinRequest(
		contestAdmin,
		contest.data.ref,
		joinRequest.request.ref
	);
	let unassignedParticipantB = joinRequest.user;

	if (debug) {
		options.method = 'GET';
		options.uri = signPath(`/contest/${contest.data.ref}`);
		let response = await request(options);
		console.log('\x1b[41m%s\x1b[0m', 'Debug:' + JSON.stringify(response, null, 3));
	}

	let consoleOutput2 = {
		all_user_passwords: '1q1q',
		contest: {
			ref: contest.data.ref,
			handle: contest.data.handle,
			admin: contestAdmin.email,
			alias: contest.data.alias,
		},
		collection_a: {
			ref: collectionA.ref,
			impressions: [collectionAImpressionA?.ref, collectionAImpressionB?.ref],
		},
		collection_b: {
			ref: collectionB?.ref,
			impressions: [collectionBImpressionA?.ref, collectionBImpressionB?.ref],
		},
		collection_c: {
			ref: collectionC?.ref,
			impressions: [collectionCImpressionA?.ref, collectionCImpressionB?.ref],
		},
		teamA: {
			ref: teamA.ref,
			leader: teamALeader.email,
			guide: teamAMemberA.email,
			member: teamAMemberB.email,
		},
		teamB: {
			ref: teamB.ref,
			leader: teamBLeader.email,
			guide: teamBMemberA.email,
			member: teamBMemberB.email,
		},
		teamC: {
			ref: teamC.ref,
			leader: teamCLeader.email,
			guide: teamCMemberA.email,
			member: teamCMemberB.email,
		},
		unassignedParticipants: {
			unassignedParticipantA: unassignedParticipantA.email,
			unassignedParticipantB: unassignedParticipantB.email,
		},
		adminRequests: {
			adminRequestA: {
				email: adminRequestA.email,
				actionRef: adminRequestA.actionRef,
			},
			adminRequestB: {
				email: adminRequestB.email,
				actionRef: adminRequestB.actionRef,
			},
		},
		participantRequests: {
			participantRequestA: {
				email: participantRequestA.email,
				actionRef: participantRequestA.actionRef,
			},
			participantRequestB: {
				email: participantRequestB.email,
				actionRef: participantRequestB.actionRef,
			},
		},
	};

	success('Contest seed done!');
	dump(consoleOutput2);
	info(`/contest/${contest.data.ref}`);
}

init();
