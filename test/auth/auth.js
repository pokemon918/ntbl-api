const request = require('request-promise');
const {baseUrl, createItem, createUser, getItem} = require('../common.js');
const {
	getAuthCreationPayload,
	initiateLogin,
	getRequestSignature,
} = require('../../ntbl_client/ntbl_api.js');

const Auth = () => {
	const getUserSpecs = async (email, fullResponse = false) => {
		const path = baseUrl + '/user?email=' + email;
		return await getItem(path);
	};

	const register = async (user, callback) => {
		// create email and pass for the demo app
		let email = user.email;
		let rawPass = user.password;
		let signedUserData = getAuthCreationPayload(rawPass, email);

		console.log(signedUserData, 'signedUserData');

		let result = await createUser(signedUserData);
		user.ref = result.data.ref;
		callback(result); // run callback
	};

	const login = async (rawPass, email) => {
		// Get user specs from the server
		let specs = await getUserSpecs(email); // pass a temp working email

		// store user specs and credentials
		initiateLogin(rawPass, specs.ref, specs.salt, specs.iterations);
	};

	const simulateClientRequest = async (user, pathToSimulate, callback) => {
		console.log('Simulating - ' + pathToSimulate);

		// Simulate login
		let email = user.email;
		let rawPass = user.password;
		await login(rawPass, email); //execute login

		// Create signature
		let urlMethod = 'GET';
		let signature = getRequestSignature(urlMethod, pathToSimulate);
		let signedPath = baseUrl + pathToSimulate + '?who=' + signature;

		// execute get request
		let result = await getItem(signedPath);
		callback(result, 'Successfully finished running ' + pathToSimulate);
	};

	return {
		register,
		login,
		simulateClientRequest,
	};
};

exports.Auth = Auth();
