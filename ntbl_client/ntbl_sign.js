const crypto = require('crypto');
const shake256 = require('js-sha3').shake256;
const base32 = require('hi-base32');

const ntbl_auth = () => {
	const minIterations = 15001;
	const maxIterations = minIterations + 1e4;
	const digestLength = 72;
	const implementation = 'NTBL';

	const getRandomInt = (max) => {
		return Math.floor(Math.random() * Math.floor(max));
	};

	const sha256 = (str) => {
		let hash = crypto.createHash('sha256').update(str).digest('hex');
		return hash;
	};

	const sha256d = (str) => {
		let hash = sha256(sha256(str));
		return hash;
	};

	const hmac_sha256 = (msg, hpass) => {
		let digest = crypto.createHmac('sha256', hpass).update(msg).digest('hex');
		return digest;
	};

	const generateSecret = (seed, iterations, salt = null, len = 32, algo = 'sha256') => {
		iterations = iterations || minIterations + getRandomInt(maxIterations - minIterations);

		let rawSalt = salt ? salt : sha256d(implementation + iterations);
		let secret = crypto
			.pbkdf2Sync(implementation + seed, rawSalt, iterations, len, algo)
			.toString('hex');

		return {secret, iterations};
	};

	const generateHpass = (secret, salt, iterations, len = 32, algo = 'sha256') => {
		return crypto.pbkdf2Sync(implementation + secret, salt, iterations, len, algo).toString('hex');
	};

	const generateRequestSignature = (urlMethod, urlPath, userRef, hpass) => {
		if (urlMethod == null || urlPath == null || userRef == null || hpass == null)
			throw 'Invalid signature params';

		urlPath = urlPath.replace(/^\/|\/$/g, '');
		let tstamp = Date.now();
		let msg = userRef + urlMethod + urlPath + tstamp; // do a demo for tasting
		msg = msg.toLowerCase();
		let hash = hmac_sha256(msg, hpass);
		let digest = shake256(hash, 72);
		let signature = base32.encode(`${userRef}:${tstamp}:${digest}`);

		return signature;
	};

	return {
		generateRequestSignature,
		generateHpass,
		generateSecret,
	};
};

module.exports = ntbl_auth();
