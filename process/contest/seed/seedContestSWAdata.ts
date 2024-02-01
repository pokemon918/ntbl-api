const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const request = require('request-promise');

const error = console.error;
const dump = console.debug;
const info = console.info;
const warn = console.warn;
const success = console.log;

/*const str2stream = require('string-to-stream');
const {Readable} = require('stream');*/

const wineData = require('../data/demodataR2.json');

const DEBUG = false;

function fileBase64(file) {
	// read binary data
	var bitmap = fs.readFileSync(file);
	// convert binary data to base64 encoded string
	return bitmap.toString('base64');
}

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
} = require('../../../test/common.js');

let collectionRemote,
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
	let contestAdmin = generateUserData({role: 'admin', voucher: 'scholar123'});
	let contestAdminData = await createItem(createUserPath, contestAdmin);

	await login(contestAdmin.email, contestAdmin.rawPass);
	options = {...basePostOptions};

	success('Creating contest');
	options.uri = signPath('/contest/new', 'POST');
	options.body = {
		name: 'Sommelier Wine Awards 2020',
		description:
			"The Sommelier Wine Awards is Britain's only on-trade wine competition, we focus entirely on wines aimed at the on-trade.",
		handle: 'swa' + (+new Date() % 10000),
		alias: {
			admin: 'Head judge',
			leader: 'Team leader',
			guide: 'Senior judge',
			member: 'Judge',
			collection: 'Flight',
			theme: 'Category',
		},
		avatar: fileBase64(__dirname + '/../data/SWA2020logosmall.png'),
	};

	let contest = await request(options);

	dump(contest);

	warn('Password for all users: 1q1q');

	info('Team 1');
	options.uri = signPath('/contest/' + contest.data.ref + '/add/team', 'POST');
	options.body = {
		name: 'Team 1',
		description: '',
	};
	let teamAResponse = await request(options);
	let teamA = teamAResponse.data;
	let teamALeader = await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'leader');
	let teamAMemberA = await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'guide');
	let teamAMemberB = await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');
	/*	await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');
	await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');
	await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');
	await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');
	await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');
	await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');
	await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');
	await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');
	await createDivisionMemberWithRole(contestAdmin, contest, teamA, 'member');*/

	info('Team 2');
	options.uri = signPath('/contest/' + contest.data.ref + '/add/team', 'POST');
	options.body = {
		name: 'Team 2',
		description: '',
	};
	let teamBResponse = await request(options);
	let teamB = teamBResponse.data;
	let teamBLeader = await createDivisionMemberWithRole(contestAdmin, contest, teamB, 'leader');
	let teamBMemberA = await createDivisionMemberWithRole(contestAdmin, contest, teamB, 'guide');
	let teamBMemberB = await createDivisionMemberWithRole(contestAdmin, contest, teamB, 'member');

	info('Team 3');
	options.uri = signPath('/contest/' + contest.data.ref + '/add/team', 'POST');
	options.body = {
		name: 'Team 3',
		description: '',
	};
	let teamCResponse = await request(options);
	let teamC = teamCResponse.data;
	let teamCLeader = await createDivisionMemberWithRole(contestAdmin, contest, teamC, 'leader');
	let teamCMemberA = await createDivisionMemberWithRole(contestAdmin, contest, teamC, 'guide');
	let teamCMemberB = await createDivisionMemberWithRole(contestAdmin, contest, teamC, 'member');

	const teams = {
		'Team 1': teamA,
		'Team 2': teamB,
		'Team 3': teamC,
	};

	info(`About to load collection data for ${Object.keys(wineData).length} flights`);

	let mem = [];
	for (let key in wineData) {
		('use strict');
		let options = {...basePostOptions};
		const event = wineData[key];

		DEBUG && info('Collection: ' + event.meta.flight);

		options.uri = signPath('/contest/' + contest.data.ref + '/add/collection', 'POST');
		options.body = {
			name: event.meta.flight,
			description: '',
			theme: event.meta.category,
			metadata: event.meta.metadata,
			start_date: '2020-01-10 08:00:00',
			end_date: '2022-01-20 22:00:00',
		};
		let collectionResponse = await request(options);
		let collectionRemote = collectionResponse.data;

		DEBUG && info('Import Wines into Collection');
		options.uri = signPath(
			`/contest/${contest.data.ref}/collection/${collectionRemote.ref}/import/impressions`,
			'POST'
		);

		options.body = {
			payload: JSON.stringify({
				impressions: event.wines,
			}),
		};
		let response = await request(options);

		//dump(response);

		DEBUG && info('Assign Collection to ' + event.meta.team);
		options.uri = signPath(
			`/contest/${contest.data.ref}/collection/${collectionRemote.ref}/assign/${
				teams[event.meta.team].ref
			}`,
			'POST'
		);
		await request(options);

		DEBUG && success(key + ' done!');

		//		mem.push({event, collectionRemote, subjects: collectionAImpressions.data.length});
		mem.push({event, collectionRemote});
	}

	//dump(mem);

	info('Summary');

	let consoleOutput2 = {
		all_user_passwords: '1q1q',
		contest: {
			handle: contest.data.handle,
			admin: contestAdmin.email,
			alias: contest.data.alias,
			ref: contest.data.ref,
		},
		teamA: {
			leader: teamALeader.email,
			guide: teamAMemberA.email,
			member: teamAMemberB.email,
			ref: teamA.ref,
		},
		teamB: {
			leader: teamBLeader.email,
			guide: teamBMemberA.email,
			member: teamBMemberB.email,
			ref: teamB.ref,
		},
		teamC: {
			leader: teamCLeader.email,
			guide: teamCMemberA.email,
			member: teamCMemberB.email,
			ref: teamC.ref,
		} /*
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
		},*/,
	};

	dump(consoleOutput2);
	success('Contest seed done!');
	info(`${baseUrl}/contest/${contest.data.ref}`);

	console.log();
	console.log('password:     1q1q');
	console.log('Supervisor:  ', consoleOutput2.contest.admin);
	console.log('Team leader: ', consoleOutput2.teamA.leader);
	console.log('Senior judge:', consoleOutput2.teamA.guide);
	console.log('Judge:       ', consoleOutput2.teamA.member);
	console.log('Search event:', consoleOutput2.contest.handle);
	console.log();
}

init();
