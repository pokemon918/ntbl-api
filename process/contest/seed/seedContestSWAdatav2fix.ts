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

wineData = getData();

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
let contestRef = process.env.CONTEST_REF || kill('Please provide CONTEST_REF');
let teamRef = process.env.TEAM_REF || kill('Please provide TEAM_REF');
let contestHandle = 'Unknown';
let adminEmail = process.env.EMAIL;
let adminPass = process.env.PASS;

if (!!contestRef && !adminEmail) kill('Please provide EMAIL');
if (!!adminEmail && !adminPass) kill('Please provide PASS');
simulateUsers = false;

async function init() {
	let options;
	options = {...basePostOptions};

	await login(adminEmail, adminPass);

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

	options.uri = signPath(
		`/contest/${contest.data.ref}/collection/${collectionRemote.ref}/assign/${teamRef}`,
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
	if (0 && addUsers) {
		teamLeader = await createDivisionMemberWithRole(contestAdmin, contest, team, 'leader');
		teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'guide'));
		teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));
		teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));
		teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));
		teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));
		teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));

		if (!(+new Date() % 2))
			teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));

		if (!(+new Date() % 3))
			teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));

		if (!(+new Date() % 4))
			teamMembers.push(await createDivisionMemberWithRole(contestAdmin, contest, team, 'member'));
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

function getData() {
	return {
		'[GRE-W] Greece white': {
			meta: {
				team: 'Team 2',
				category: '[GRE-W] Greece white',
				flight: '[GRE-W] Greece white',
				metadata: '{"medal_page":true,"swa_round_2":true,"tastingType":"swa20"}',
				start_date: '2020-03-09 01:01:00',
				end_date: '2020-03-09 23:01:00',
			},
			wines: [
				{
					country: 'Greece',
					name: '2020_GRE-W_003A',
					region: 'Nemea',
					vintage: 2018,
					price: 10.24,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
				{
					country: 'Greece',
					name: '2020_GRE-W_005',
					region: 'Attika',
					vintage: 2019,
					price: 10.75,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
				{
					country: 'Greece',
					name: '2020_GRE-W_008',
					region: 'Attika',
					vintage: 2019,
					price: 12.15,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
				{
					country: 'Greece',
					name: '2020_GRE-W_001',
					region: 'Attika',
					vintage: 2019,
					price: 9.3,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
				{
					country: 'Greece',
					name: '2020_GRE-W_012',
					region: 'Aegean Islands',
					vintage: 2018,
					price: 14.55,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
				{
					country: 'Greece',
					name: '2020_GRE-W_014',
					region: 'SANTORINI',
					vintage: 2018,
					price: 16.14,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
				{
					country: 'Greece',
					name: '2020_GRE-W_011',
					region: 'Macedonia',
					vintage: 2019,
					price: 14.36,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
				{
					country: 'Greece',
					name: '2020_GRE-W_015',
					region: 'Macedonia',
					vintage: 2019,
					price: 16.28,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
				{
					country: 'Greece',
					name: '2020_GRE-W_010',
					region: 'Crete',
					vintage: 2018,
					price: 12.54,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
				{
					country: 'Greece',
					name: '2020_GRE-W_013',
					region: 'Florina',
					vintage: 2018,
					price: 15.11,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_white'],
					},
				},
			],
		},
	};
}
