const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const requestPromise = require('request-promise');
var FormData = require('form-data');
import {error, dump, info, warn, success, kill} from '../../vendor/printit (use throwlog instead)';
import {removeAllListeners} from 'cluster';
import Chiqq from '../../vendor/Chiqq';
/*const str2stream = require('string-to-stream');
const {Readable} = require('stream');*/

const DEBUG = false;

let wineData = require('../data/demodata.json');
wineData = require('../data/finalSwa2020.json');
wineData = require('../data/finalSwa2020R2.json');
wineData = require('../data/finalSwa2020R3.json');

async function request(req) {
	let res = requestPromise(req);
	if (DEBUG) {
		console.warn(req.uri);
		console.time(req.uri);

		res = res.then((x) => {
			console.timeEnd(req.uri);
			return x;
		});
	}

	return res;
}

let q = new Chiqq({concurrency: 1});

async function request2(req) {
	let res = requestPromise(req);
	if (DEBUG) {
		console.time(req.uri);

		res = res.then((x) => {
			console.timeEnd(req.uri);
			return x;
		});
	}

	return res;
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

let teams = {};
let users = {};

let simulateUsers = true;
let contestRef = process.env.CONTEST_REF;
let contestHandle = 'Unknown';
let adminEmail = process.env.EMAIL;
let adminPass = process.env.PASS;

if (!!contestRef && !adminEmail) kill('Please provide EMAIL');
if (!!adminEmail && !adminPass) kill('Please provide PASS');
if (!!contestRef) simulateUsers = false;

async function init() {
	let options;
	options = {...basePostOptions};

	if (!adminPass) {
		let createUserPath = baseUrl + '/user';
		let contestAdmin = generateUserData({role: 'admin', voucher: 'scholar123'});
		dump(contestAdmin);
		let contestAdminData = await createItem(createUserPath, contestAdmin);
		adminEmail = contestAdmin.email;
		adminPass = contestAdmin.rawPass;
		warn('Password for all users: 1q1q');
	}

	await login(adminEmail, adminPass);

	if (!contestRef) {
		success('Creating contest');
		options.uri = signPath('/contest/new', 'POST');
		options.body = {
			name: 'Sommelier Wine Awards 2020 Round 3',
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
			avatar: fileBase64(__dirname + '/../data/SWA2020logosmall.png'),
		};

		let contest = await request(options);

		dump(contest);

		contestRef = contest.data.ref;
		contestHandle = contest.data.handle;
	}

	info(`About to load collection data for ${Object.keys(wineData).length} flights`);

	let mem = [];
	let toejler = [];
	for (let key in wineData) {
		const event = wineData[key];
		//if (['Team 1', 'Team 2', 'Team 3'].includes(event.meta.team))
		toejler.push(
			q.add(
				async () =>
					await makeFlight(
						mem,
						key,
						event,
						{data: {ref: contestRef}},
						{email: adminEmail, rawPass: adminPass},
						simulateUsers
					)
			)
		);
	}

	await Promise.all(toejler);

	// dump(mem);

	let dataDump = {
		password_for_all: '1q1q',
		//find_via: contest.data.handle,
		admin: adminEmail,
		teams: Object.keys(teams).map((key) => {
			const t = teams[key];
			return {
				name: t.name,
				leader: t.teamLeader?.email,
				guide: t.teamGuide?.email,
				member: t.teamMember?.email,
			};
		}),
	};

	info('Summary');
	dump(dataDump);
	success('Contest seed done!');
	info(`${baseUrl}/contest/${contestRef}`);

	/*	console.log();
	console.log('password:     1q1q');
	console.log('Supervisor:  ', consoleOutput2.contest.admin);
	console.log('Team leader: ', consoleOutput2.teamA.leader);
	console.log('Senior judge:', consoleOutput2.teamA.guide);
	console.log('Judge:       ', consoleOutput2.teamA.member);
	console.log('Search event:', consoleOutput2.contest.handle);
	console.log();

	*/
}

init();

var antal = 0;

async function makeFlight(mem, key, event, contest, contestAdmin, addUsers = true) {
	let options = {...basePostOptions};

	options.uri = signPath('/contest/' + contest.data.ref + '/add/collection', 'POST');
	options.body = {
		name: event.meta.flight,
		description: '',
		theme: event.meta.category,
		metadata: event.meta.metadata,
		start_date: event.meta.start_date || null,
		end_date: event.meta.end_date || null,
	};
	let collectionResponse = await request(options);
	//dump(collectionResponse);
	let collectionRemote = collectionResponse.data;

	info(`Flight created: ` + event.meta.flight);

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

	DEBUG && info('Imported Wines into Collection');

	//dump(response);

	teams[event.meta.team] =
		teams[event.meta.team] ||
		(await addTeamToContest(contest, contestAdmin, event.meta.team, addUsers));

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionRemote.ref}/assign/${
			teams[event.meta.team].ref
		}`,
		'POST'
	);
	await request(options);

	DEBUG && info('Assigned collection to ' + event.meta.team);

	success(key + ` done! (${++antal})`);

	//		mem.push({event, collectionRemote, subjects: collectionAImpressions.data.length});

	mem.push({event, collectionRemote});

	//dump(teams);
	//kill(event);
}

async function addTeamToContest(contest, contestAdmin, name, addUsers = true) {
	let teamLeader, teamGuide, teamMember;

	let options = {...basePostOptions};

	options.uri = signPath('/contest/' + contest.data.ref + '/add/team', 'POST');
	options.body = {
		name,
		description: '',
	};
	let res = await request(options);
	let team = res.data;
	let teamMembers = [];

	if (addUsers) {
		teamLeader = await createDivisionMemberWithRole(contestAdmin, contest, team, 'leader');
		//teamLeader = await createDivisionMemberWithRole(contestAdmin, contest, team, 'leader');
		teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'guide'));
		teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));
		//teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));
		//teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));
		//teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));
		//teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));

		/*if (!(+new Date() % 2))
			teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));

		if (!(+new Date() % 3))
			teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));

		if (!(+new Date() % 4))
			teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));

			*/
	}

	info(`Created team '${name}'`);

	let userInfo = {
		...team,
		teamLeader,
		teamMembers,
	};

	dump(userInfo);

	return userInfo;
}

function fileBase64(file) {
	// read binary data
	var bitmap = fs.readFileSync(file);
	// convert binary data to base64 encoded string
	return bitmap.toString('base64');
}
