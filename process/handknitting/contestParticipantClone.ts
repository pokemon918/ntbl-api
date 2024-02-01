'use strict';

const request = require('request-promise');
import {kill, error_, dump, info_, warn_, success_} from '../vendor/printit (use throwlog instead)';
import {
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
} from '../../test/common.js';

// HOST=https://v2.ntbl-api.eu PORT=443 EMAIL=ma@bc.c PASS=123  ts-node-dev  --inspect-brk -- process/handknitting/voucher.ts
// chrome://inspect
debugger;

async function init() {
	const EMAIL = process.env.EMAIL || kill('Please set EMAIL');
	const PASS = process.env.PASS || kill('Please set PASS');
	const FROM_REF = process.env.FROM_REF || kill('Please set FROM_REF');
	const TO_REF = process.env.TO_REF || kill('Please set TO_REF');

	//	await login(EMAIL, PASS);

	await login(EMAIL, PASS);

	let options: any = {...basePostOptions, method: 'POST'};

	success_('Creating contest');
	options.uri = signPath(`/contest/${TO_REF}/copy-from/contest/${FROM_REF}/participant`, 'POST');

	warn_('About to send');

	dump(options);

	let res = await request(options).catch((e) => kill(e.error));

	info_('Got this back');

	console.log(JSON.stringify(res, null, 2));

	success_('All done');
}

init();
