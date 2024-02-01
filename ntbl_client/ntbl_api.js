const sign = require('./ntbl_sign');

const ntbl_api = () => {
	let mem = {
		hpass: '',
		userRef: '',
	};

	const getAuthCreationPayload = (seed, email) => {
		const {secret, iterations} = sign.generateSecret(seed);

		let payload = {
			hpass: secret,
			iterations: iterations,
		};

		if (email) {
			payload.email = email;
		}

		return payload;
	};

	const initiateLogin = (seed, userRef, salt, iterations) => {
		const {secret} = sign.generateSecret(seed, iterations);

		mem.userRef = userRef;

		mem.hpass = sign.generateHpass(secret, salt, iterations);

		// todo: verify that credentials are valid

		return true;
	};

	const getRequestSignature = (urlMethod, urlPath, userRef = mem.userRef, hpass = mem.hpass) => {
		return sign.generateRequestSignature(urlMethod, urlPath, userRef, hpass);
	};

	const getHpass = () => {
		return mem.hpass;
	};

	const exportBackup = () => {
		return JSON.stringify(mem);
	};

	const importBackup = (data) => {
		let _mem = JSON.parse(data);
		if (!_mem.hpass || !_mem.userRef) {
			throw 'Error in imported data';
		}

		mem = _mem;
	};

	return {
		getAuthCreationPayload,
		initiateLogin,
		getRequestSignature,
		getHpass,
		exportBackup,
		importBackup,
	};
};

module.exports = ntbl_api();
