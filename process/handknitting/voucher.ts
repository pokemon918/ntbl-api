'use strict';

const request = require('request-promise');
import {kill, error, dump, info, warn, success} from '../vendor/printit (use throwlog instead)';
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
	const EMAIL = process.env.EMAIL;
	const PASS = process.env.PASS;

	if (!EMAIL) {
		kill('Please set EMAIL');
	}

	if (!PASS) {
		kill('Please set PASS');
	}

	await login(EMAIL, PASS);

	let options: any = {...basePostOptions};

	success('Creating contest');
	options.uri = signPath('/admin/subscription/vouchers', 'POST');
	/*	options.body = {
		plan: 'scholar',
		vouchers: [
			{
				code: 'TAILD',
				valid_days: -1,
				usage_limit: -1,
			},
			{
				code: 'SPEC88755',
				valid_days: -1,
				usage_limit: -1,
			},
		],
	};*/

	options.body = {
		plan: 'scholar',
		vouchers: [
			{
				code: 'STU1YL51',
				valid_days: 365,
				usage_limit: 15,
			},
		],
	};

	warn('About to send');

	dump(options);

	let res = await request(options).catch((e) => kill(e.error));
	info('Got this back');

	dump(res);

	success('All done');
}

init();
