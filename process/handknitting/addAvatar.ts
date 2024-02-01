const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const requestPromise = require('request-promise');
var FormData = require('form-data');
import {error, dump, info, warn, success, kill} from '../vendor/printit (use throwlog instead)';
import {removeAllListeners} from 'cluster';
/*const str2stream = require('string-to-stream');
const {Readable} = require('stream');*/

const DEBUG = true;

async function request(req) {
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

let contestRef = process.env.CONTEST_REF || kill('Please provide CONTEST_REF');
let email = process.env.EMAIL || kill('Please provide EMAIL');
let pass = process.env.PASS || kill('Please provide PASS');

async function init() {
	let debug = false;
	let options;
	let createUserPath = baseUrl + '/user';
	/*let contestAdmin = generateUserData({
		role: 'admin',
		name: 'SWA 2020 Admin',
		password: '1q1qabc',
		email: 'swa2020@noteable.co',
		voucher: 'tastersguild',
	});
	let contestAdminData = await createItem(createUserPath, contestAdmin);
	*/

	await login(email, pass);
	options = {...basePostOptions};

	success(`Adding avatar to ${contestRef}`);
	options.uri = signPath(`/team/${contestRef}`, 'POST');
	options.body = {
		avatar: fileBase64(__dirname + '/../contest/data-swa/SWA2020logosmall.png'),
	};

	let contest = await request(options);

	dump(contest);
}

init();

function fileBase64(file) {
	// read binary data
	var bitmap = fs.readFileSync(file);
	// convert binary data to base64 encoded string
	return bitmap.toString('base64');
}
