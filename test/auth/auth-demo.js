const auth = require('./auth.js').Auth;
const makeRandomInt = require('../common.js').makeRandomInt;

// Create a test user
let user = {
	name: 'Auth Demo User',
	email: 'email_' + makeRandomInt(1, 9000) + makeRandomInt(1, 9000) + '@ntbl-api.com',
	password: '1q1q',
};

let standardCallback = (data) => {
	let result = data;
	let ref = result.data.ref;
	let pathToSimulate = null;

	let callback = (res, msg) => {
		console.log(res);
		console.log(msg);
	};

	// Login the registered user and simulate client request for each of the given path.
	pathToSimulate = '/raw/identity/' + ref;
	auth.simulateClientRequest(user, pathToSimulate, callback);
};

// Register the user
auth.register(user, standardCallback);
