const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const requestPromise = require('request-promise');
var FormData = require('form-data');
import {error, dump, info, warn, success, kill} from '../vendor/printit (use throwlog instead)';
import {removeAllListeners} from 'cluster';
import Chiqq from '../vendor/Chiqq';

let q = new Chiqq({concurrency: 1});

const DEBUG = false;

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

const {baseUrl, basePostOptions, login, signPath} = require('../../test/common.js');

let email = process.env.EMAIL || kill('Please provide EMAIL');
let pass = process.env.PASS || kill('Please provide PASS');

async function init() {
	let urls = [
		'/contest/escptx/remove/team/llsp6q',
		'/contest/escptx/remove/team/hsrs76',
		'/contest/escptx/remove/team/lf5ng8',
		'/contest/escptx/remove/team/dtd5tm',
		'/contest/escptx/remove/team/b2mehl',
		'/contest/escptx/remove/team/ql4l46',
		'/contest/escptx/remove/team/tnf84z',
		'/contest/escptx/remove/team/l5c5g8',
		'/contest/escptx/remove/team/kkb49z',
		'/contest/escptx/remove/team/kffbap',
		'/contest/escptx/remove/collection/s8r94e',
		'/contest/escptx/remove/collection/mexn5c',
		'/contest/escptx/remove/collection/mz4efh',
		'/contest/escptx/remove/collection/dsdhx4',
		'/contest/escptx/remove/collection/y6mxpl',
		'/contest/escptx/remove/collection/hd7xtt',
		'/contest/escptx/remove/collection/mpg9p9',
		'/contest/escptx/remove/collection/bs6xp5',
		'/contest/escptx/remove/collection/hb7nek',
		'/contest/escptx/remove/collection/m798cy',
		'/contest/escptx/remove/collection/emgxsr',
		'/contest/escptx/remove/collection/zhp8xl',
		'/contest/escptx/remove/collection/ck8qtt',
		'/contest/escptx/remove/collection/a9cftq',
		'/contest/escptx/remove/collection/gle9yt',
		'/contest/escptx/remove/collection/eazthf',
		'/contest/escptx/remove/collection/nldyl5',
		'/contest/escptx/remove/collection/s32pxp',
		'/contest/escptx/remove/collection/knxt79',
		'/contest/escptx/remove/collection/gbas5g',
		'/contest/escptx/remove/collection/q79dek',
		'/contest/escptx/remove/collection/r3d8dh',
		'/contest/escptx/remove/collection/xhk4rq',
		'/contest/escptx/remove/collection/pa6eya',
		'/contest/escptx/remove/collection/f66rsq',
		'/contest/escptx/remove/collection/gqxkh7',
		'/contest/escptx/remove/collection/t6n2e7',
		'/contest/escptx/remove/collection/hr5zrp',
		'/contest/escptx/remove/collection/lk8az8',
		'/contest/escptx/remove/collection/fc2hy4',
		'/contest/escptx/remove/collection/bmmnap',
		'/contest/escptx/remove/collection/p7epx7',
		'/contest/escptx/remove/collection/czhgkm',
		'/contest/escptx/remove/collection/a43grk',
		'/contest/escptx/remove/collection/e8eysh',
		'/contest/escptx/remove/collection/dnetba',
		'/contest/escptx/remove/collection/xel24y',
		'/contest/escptx/remove/collection/k5yyy8',
		'/contest/escptx/remove/collection/echc46',
		'/contest/escptx/remove/collection/pbafbg',
		'/contest/escptx/remove/collection/sk6x7x',
		'/contest/escptx/remove/collection/tph6zd',
		'/contest/escptx/remove/collection/cd5aga',
		'/contest/escptx/remove/collection/scghed',
		'/contest/escptx/remove/collection/aza8xq',
		'/contest/escptx/remove/collection/x26l9h',
		'/contest/escptx/remove/collection/m862z7',
		'/contest/escptx/remove/collection/rkxlz3',
		'/contest/escptx/remove/collection/a2nd2n',
		'/contest/escptx/remove/collection/zlshqa',
		'/contest/escptx/remove/collection/g4zyyk',
		'/contest/escptx/remove/collection/e6c77q',
		'/contest/escptx/remove/collection/ac74nc',
		'/contest/escptx/remove/collection/s3ase7',
		'/contest/escptx/remove/collection/ptltp7',
		'/contest/escptx/remove/collection/h2sfxn',
		'/contest/escptx/remove/collection/l3a7x4',
		'/contest/escptx/remove/collection/l54gqe',
		'/contest/escptx/remove/collection/nq5463',
		'/contest/escptx/remove/collection/r4z7pr',
		'/contest/escptx/remove/collection/ehggpr',
		'/contest/escptx/remove/collection/hf35xb',
		'/contest/escptx/remove/collection/k6rr28',
		'/contest/escptx/remove/collection/fxf4xy',
		'/contest/escptx/remove/collection/kzslqz',
		'/contest/escptx/remove/collection/sdyp8s',
		'/contest/escptx/remove/collection/qtnsgp',
		'/contest/escptx/remove/collection/z24rl3',
		'/contest/escptx/remove/collection/kh565p',
		'/contest/escptx/remove/collection/easfs4',
		'/contest/escptx/remove/collection/fzeztb',
		'/contest/escptx/remove/collection/cba3xt',
		'/contest/escptx/remove/collection/te4qtr',
		'/contest/escptx/remove/collection/yrmbgy',
		'/contest/escptx/remove/collection/s9999x',
		'/contest/escptx/remove/collection/cqqs2c',
		'/contest/escptx/remove/collection/gtq98p',
		'/contest/escptx/remove/collection/t3bppg',
		'/contest/escptx/remove/collection/przfc9',
		'/contest/escptx/remove/collection/a3be2r',
		'/contest/escptx/remove/collection/mtgzxb',
		'/contest/escptx/remove/collection/pnf2q5',
		'/contest/escptx/remove/collection/aqzqs7',
		'/contest/escptx/remove/collection/lh5lpt',
		'/contest/escptx/remove/collection/t9smbe',
		'/contest/escptx/remove/collection/dp6lzd',
		'/contest/escptx/remove/collection/fc29tt',
		'/contest/escptx/remove/collection/kepf6z',
		'/contest/escptx/remove/collection/hsfbht',
		'/contest/escptx/remove/collection/lz3dml',
		'/contest/escptx/remove/collection/hygsfe',
		'/contest/escptx/remove/collection/xrm2l4',
		'/contest/escptx/remove/collection/rsnldh',
		'/contest/escptx/remove/collection/s6f49g',
		'/contest/escptx/remove/collection/gp3etg',
		'/contest/escptx/remove/collection/mb5mdg',
		'/contest/escptx/remove/collection/cgn6n7',
		'/contest/escptx/remove/collection/csr69f',
		'/contest/escptx/remove/collection/qdmtn5',
		'/contest/escptx/remove/collection/nrh9kz',
		'/contest/escptx/remove/collection/h3nbtn',
		'/contest/escptx/remove/collection/xf5l68',
		'/contest/escptx/remove/collection/cmn8mc',
		'/contest/escptx/remove/collection/f3fc2z',
		'/contest/escptx/remove/collection/bzr63l',
		'/contest/escptx/remove/collection/a6lasx',
		'/contest/escptx/remove/collection/pqh3dm',
		'/contest/escptx/remove/collection/he8x4q',
	];

	let frame = [];

	await login(email, pass);

	urls.map(async (el) => frame.push(q.add(async () => await goPost(el))));
	await Promise.all(frame);
	success('done!');
}

init();

async function goPost(url) {
	let options;

	options = {...basePostOptions};

	options.uri = await signPath(url, 'POST');
	options.body = {};
	dump(options);
	let res = await request(options);

	dump(res);
}

async function goGet(url) {
	let options;

	options = {...basePostOptions};

	options.uri = await signPath(url, 'GET');

	options.method = 'GET';
	dump(options);
	let res = await request(options);
	dump(res);
}
