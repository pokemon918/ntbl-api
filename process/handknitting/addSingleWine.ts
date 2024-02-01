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
	const CONTEST_REF = process.env.CONTEST_REF || kill('Please set CONTEST_REF');
	const COLLECTION_REF = process.env.COLLECTION_REF || kill('Please set COLLECTION_REF');

	//	await login(EMAIL, PASS);

	await login(EMAIL, PASS);

	let options: any = {...basePostOptions, method: 'POST'};

	success_('Creating contest');

	options.uri = signPath(
		`/contest/${CONTEST_REF}/collection/${COLLECTION_REF}/import/impressions`,
		'POST'
	);

	options.body = {
		payload: JSON.stringify({
			impressions: [
				/*{
					remember to fix! country: 'France',
					name: 'FR-S-LAN-R_003',
					region: 'Vin De France',
					vintage: 2019,
					price: 6.09,
					currency: 'GBP',
					notes: {
						'@': ['category_still', 'nuance_red'],
					},
				},
				/*{
				"country": "France",
				"name": "Wine 2 still white",
				"region": "Touraine",
				"vintage": 2017,
				"price": 9.57,
				"currency": "GBP",
				"notes": {
					"@": ["category_still", "nuance_white"]
				}
			},*/
			],
		}),
	};

	warn_('About to send');

	dump(options);

	let res = await request(options).catch((e) => kill(e.error));

	info_('Got this back');

	console.log(JSON.stringify(res, null, 2));

	success_('All done');
}

init();
