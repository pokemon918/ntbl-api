const requestPromise = require('request-promise');
const chai = require('chai');
const expect = chai.expect;
const crypto = require('crypto');
const faker = require('faker');
const dotenv = require('dotenv').config();
const fs = require('fs');
const np = require('path');
const mime = require('mime-types');
const dateFormat = require('dateformat');
require('chai-date-string')(chai);
chai.use(require('chai-datetime'));

const {
	getAuthCreationPayload,
	getRequestSignature,
	initiateLogin,
} = require('../ntbl_client/ntbl_api.js');

const DEBUG = false;

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

const HOST = process.env.API || process.env.HOST || 'http://127.0.0.1';
const PORT = process.env.PORT || 8000;
const baseUrl = `${HOST}:${PORT}`;

const basePostOptions = {
	method: 'POST',
	json: true,
};

const baseGetOptions = {
	method: 'GET',
	json: true,
};

const baseDeleteOptions = {
	method: 'DELETE',
	json: true,
};

const createItem = async (path, data, fullResponse = false) => {
	const createItemOptions = {
		method: 'POST',
		json: true,
		uri: path,
		body: data,
		transform: null,
	};

	if (fullResponse) {
		createItemOptions.transform = (body, response, resolveWithFullResponse) => {
			return response;
		};
	}

	const response = await request(createItemOptions);
	return response;
};

const createUser = async (data, fullResponse = false) => {
	const path = baseUrl + '/user';
	return await createItem(path, data);
};

const getItem = async (path, fullResponse = false) => {
	const options = {
		method: 'GET',
		json: true,
		uri: path,
		transform: null,
	};

	if (fullResponse) {
		options.transform = (body, response, resolveWithFullResponse) => {
			return response;
		};
	}

	let result = null;
	await request(options)
		.then((data) => {
			result = data;
		})
		.catch((e) => {
			result = e;
		});

	return result;
};

const checkCreateStatusCode = async (path, data, code) => {
	let statusCode = 0;
	await createItem(path, data, true)
		.catch((err) => {
			statusCode = err.statusCode;
		})
		.finally(() => expect(code).to.equal(statusCode));
};

const checkStatusCodeByOptions = async (options, code) => {
	options.transform = (body, response, resolveWithFullResponse) => {
		return response;
	};

	let statusCode = 0;
	await request(options)
		.then((response) => {
			statusCode = response.statusCode;
		})
		.catch((err) => {
			statusCode = err.statusCode;
		})
		.finally(() => expect(statusCode).to.equal(code));
};

const checkForSuccess = async (response) => {
	expect(response.status).to.equal('success');
	expect(response.message).to.be.a('string').that.have.lengthOf.above(0);
};

const makeRandomInt = (min = 5, max = 10) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

const makeUniqueString = (len = 5, alphaNumeric = false) => {
	let text = '';
	let possible = '_abcdefghijklmnopqrstuvwxyz0123456789';

	if (alphaNumeric) possible = possible.replace(/_/g, '');

	for (let i = 0; i < len; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
};

const generateUserData = (userinfo = {}) => {
	let user = {
		firstname: faker.name.firstName().replace("'"),
		lastname: faker.name.lastName().replace("'"),
		...userinfo,
	};
	user.email = faker.internet
		.email()
		.replace(
			/^.+?@/,
			[user.firstname, user.role, user.lastname.slice(0, 1)].filter(Boolean).join('.') +
				'.' +
				(+new Date() % (process.env.CI ? 1000000 : 100)) +
				'@'
		)
		.trim()
		.toLowerCase();
	user.rawPass = '1q1q';
	let creationPayload = getAuthCreationPayload(user.rawPass, user.email);

	let userData = {
		email: user.email,
		rawPass: user.rawPass,
		name: [user.firstname, uc1(user.role), user.lastname].filter(Boolean).join(' '),

		...creationPayload,
	};

	if (userinfo.hasOwnProperty('voucher')) {
		userData.voucher = userinfo.voucher;
	}

	return userData;
};

/* User related functions */

const signPath = (path, method = 'GET') => {
	let signature = getRequestSignature(method, path); // Sign urlPath
	let signedPath = baseUrl + path + '?who=' + signature;
	return signedPath;
};

const getUserSpecs = async (email, fullResponse = false) => {
	const path = baseUrl + '/user?email=' + email;
	return await getItem(path);
};

const login = async (email, rawPass) => {
	// Get user specs from the server
	let specs = await getUserSpecs(email);

	// store user specs and credentials
	initiateLogin(rawPass, specs.ref, specs.salt, specs.iterations);
};

const likeOrFollowTeam = async (action, teamRef) => {
	const options = {
		method: 'POST',
		json: true,
		uri: signPath(`/team/${teamRef}`, 'POST'),
		body: {
			relation: [action],
		},
		transform: null,
	};
	await request(options);
};

const sha256 = (str) => {
	let hash = crypto.createHash('sha256').update(str).digest('hex');
	return hash;
};

const md5 = (str) => {
	let hash = crypto.createHash('md5').update(str).digest('hex');
	return hash;
};

const validMD5 = (str) => {
	let pattern = new RegExp('^[a-fA-F0-9]{32}$');
	let result = pattern.test(str);
	return result;
};

const signPathStatic = (path, method = 'GET') => {
	let signature = getRequestSignature(method, path); // Sign urlPath
	let signedPath = baseUrl + path + '?who=tex';
	return signedPath;
};

const randomBool = () => {
	return Math.random() >= 0.5;
};

const randomPhone = (min = 9000000000, max = 9999999999) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomSocialUrl = (SocialHandle = 'linkedin') => {
	let randomSocialUrl = '';
	if (SocialHandle == 'linkedin') {
		randomSocialUrl = 'https://www.linkedin.com/in/' + makeUniqueString() + '_demo';
	} else {
		randomSocialUrl = 'https://www.twitter.com/' + makeUniqueString() + '_demo';
	}
	return randomSocialUrl;
};

const randomDOB = () => {
	let start = new Date(2010, 0, 1);
	let end = new Date(2012, 0, 1);
	let d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())),
		month = '' + (d.getMonth() + 1),
		day = '' + d.getDate(),
		year = d.getFullYear();

	if (month.length < 2) month = '0' + month;
	if (day.length < 2) day = '0' + day;

	return [year, month, day].join('-');
};

const getFormattedDate = (date) => {
	let month = '' + (date.getMonth() + 1),
		day = '' + date.getDate(),
		year = date.getFullYear();
	if (month.length < 2) month = '0' + month;
	if (day.length < 2) day = '0' + day;
	return [year, month, day].join('-');
};

const checkProps = (obj1, obj2) => {
	Object.keys(obj1).forEach((key) => {
		expect(obj2).to.have.property(key);
	});
};

const checkPropsVal = (obj1, obj2) => {
	Object.keys(obj1).forEach((key) => {
		expect(obj1[key]).to.be.deep.equal(obj2[key]);
	});
};

const checkUserProfile = (user, userProfile) => {
	// Make sure that all props of userProfile exists in user
	checkProps(userProfile, user);

	// Test for userProfile and user values
	expect(user['name']).to.be.equal(userProfile['name']);
	expect(user['handle']).to.be.equal(userProfile['handle']);
	expect(user['birth_date']).to.be.equal(userProfile['birth_date']);
	expect(user['gdpr_consent']).to.be.equal(userProfile['gdpr_consent']);
	expect(user['email']).to.be.equal(userProfile['email']);
	expect(user['avatar']).to.be.equal(userProfile['avatar']);
	expect(user['preferred_lang']).to.be.equal(userProfile['preferred_lang']);
	expect(user['preferred_currency']).to.be.equal(userProfile['preferred_currency']);
	expect(validMD5(user['gravatar'])).to.be.equal(true);
	checkProps(user['educations'], userProfile['educations']);
	checkProps(user['contact'], userProfile['contact']);
	checkProps(user['address'], userProfile['address']);
	checkProps(user['languages'], userProfile['languages']);
	checkProps(user['interests'], userProfile['interests']);

	// Compare data for user educations and userProfile educations
	for (let i = 0; i < user['educations'].length; i++) {
		checkPropsVal(user['educations'][i], userProfile['educations'][i]);
	}

	checkPropsVal(user['contact'], userProfile['contact']);
	checkPropsVal(user['wine_knowledge'], userProfile['wine_knowledge']);
	checkPropsVal(user['address'], userProfile['address']);
	checkPropsVal(user['languages'], userProfile['languages']);
	checkPropsVal(user['interests'], userProfile['interests']);
};

const checkVoucherData = (voucher) => {
	expect(voucher).to.have.property('code');
	expect(voucher).to.have.property('type');
	expect(voucher).to.have.property('usage_limit');
	expect(voucher).to.have.property('created_at');
	expect(voucher).to.have.property('updated_at');
};

const makeIsoDateString = (year = 0, month = 0, day = 0) => {
	var today = new Date();
	var isoString =
		today.getFullYear() +
		year +
		'-' +
		addZeroToNumString(today.getMonth() + 1 + month) +
		'-' +
		addZeroToNumString(today.getDate() + day) +
		' ' +
		addZeroToNumString(today.getHours()) +
		':' +
		addZeroToNumString(today.getMinutes()) +
		':' +
		addZeroToNumString(today.getSeconds());

	return isoString;
};

const addZeroToNumString = (value) => {
	return value < 10 ? '0' + value : value;
};

const deprecateNotes = async (notes) => {
	let deprecatePath = '/admin/notes/deprecate';
	let options = {...basePostOptions};
	options.transform = null;
	options.body = notes;
	options.uri = signPath(deprecatePath, options.method);
	await request(options);
};

let activateNotes = async (notes) => {
	let activatePath = '/admin/notes/activate';
	let options = {...basePostOptions};
	options.transform = null;
	options.body = notes;
	options.uri = signPath(activatePath, options.method);
	await request(options);
};

let generateJoinRequest = async (teamRef, userinfo = {}) => {
	let joiner = generateUserData(userinfo);
	let joinerData = await createItem(baseUrl + '/user', joiner);
	joiner.ref = joinerData.data.ref;
	await login(joiner.email, joiner.rawPass);
	let options = {...basePostOptions};
	options.transform = null;
	options.body = {};
	options.uri = signPath('/team/' + teamRef + '/join', 'POST');
	let joinRequest = await request(options);
	return {
		user: joiner,
		request: joinRequest.data,
	};
};

let generateJoinContestRequest = async (contestRef, relationType, userinfo = {}) => {
	let joiner = generateUserData(userinfo);
	let joinerData = await createItem(baseUrl + '/user', joiner);
	joiner.ref = joinerData.data.ref;
	let joinRequest = await requestToJoinContest(joiner, contestRef, relationType);

	return {
		user: joiner,
		request: joinRequest.data,
	};
};

let requestToJoinContest = async (credentials, contestRef, relationType) => {
	await login(credentials.email, credentials.rawPass);
	let options = {...basePostOptions};
	options.transform = null;
	options.body = {};
	options.uri = signPath('/contest/' + contestRef + '/request/role/' + relationType, 'POST');
	return await request(options);
};

let requestToJoinTraditionalTeam = async (credentials, teamRef) => {
	await login(credentials.email, credentials.rawPass);
	let options = {...basePostOptions};
	options.transform = null;
	options.body = {};
	options.uri = signPath('/team/' + teamRef + '/join', 'POST');
	return await request(options);
};

let approveJoinRequest = async (credentials, teamRef, actionRef) => {
	await login(credentials.email, credentials.rawPass);
	let options = {...basePostOptions};
	options.transform = null;
	options.body = {};
	options.uri = signPath('/team/' + teamRef + '/accept/' + actionRef, 'POST');
	let approveRequest = await request(options);
	return approveRequest;
};

let assignParticipantToDivision = async (credentials, contestTeam, participant, division) => {
	await login(credentials.email, credentials.rawPass);
	let options = {...basePostOptions};
	options.transform = null;
	options.body = {};
	options.uri = signPath(
		`/contest/${contestTeam.data.ref}/put/${participant.ref}/on/${division.ref}`,
		'POST'
	);
	let divisionAssignment = await request(options);
	return divisionAssignment;
};

let assignParticipantDivisionRole = async (credentials, contestTeam, participant, roleKey) => {
	await login(credentials.email, credentials.rawPass);
	let options = {...basePostOptions};
	options.transform = null;
	options.body = {};
	options.uri = signPath(
		`/contest/${contestTeam.data.ref}/let/${participant.ref}/be/${roleKey}`,
		'POST'
	);
	let roleAssignment = await request(options);
	return roleAssignment;
};

let createDivisionMemberWithRole = async (credentials, contestTeam, division, roleKey) => {
	// Create User and Request to Join as Participant
	let joinRequest = await generateJoinContestRequest(contestTeam.data.ref, 'participant', {
		role: roleKey,
		voucher: 'scholar123',
	});
	let participant = joinRequest.user;

	// Approve the Request to Join as Participant
	await approveJoinRequest(credentials, contestTeam.data.ref, joinRequest.request.ref);

	// Assign the Participant to a Division
	await assignParticipantToDivision(credentials, contestTeam, participant, division);

	// Assign the Participant's Role in Division
	await assignParticipantDivisionRole(credentials, contestTeam, participant, roleKey);

	return participant;
};

let generateChargifyToken = async () => {
	var today = new Date();
	let options = {...basePostOptions};
	options.body = {
		key: process.env.CHARGIFY_PUBLIC_KEY,
		revision: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
		credit_card: {
			full_number: '1',
			cvv: '123',
			expiration_month: '01',
			expiration_year: (today.getFullYear() + 1).toString(),
		},
	};

	options.uri = process.env.CHARGIFY_API_DOMAIN + '/js/tokens.json';
	let response = await request(options);
	return response.token;
};

const checkUserPlan = (plan) => {
	expect(plan).to.have.property('status');
	expect(plan).to.have.property('start_date');
	expect(plan).to.have.property('end_date');
	expect(plan).to.have.property('created_at');
	expect(plan).to.have.property('updated_at');
	expect(plan).to.have.property('active_plan');
	expect(plan).to.have.property('canceled_at');
	expect(plan).to.have.property('delayed_cancel_at');

	// Check for correct data type
	expect(plan.status).to.be.a('string');
	expect(plan.start_date).to.be.a.dateString();

	if (plan.end_date) {
		expect(plan.end_date).to.be.a.dateString();
	}

	if (plan.canceled_at) {
		expect(plan.canceled_at).to.be.a.dateString();
	}

	if (plan.delayed_cancel_at) {
		expect(plan.delayed_cancel_at).to.be.a.dateString();
	}

	expect(plan.created_at).to.be.a.dateString();
	expect(plan.updated_at).to.be.a.dateString();
	expect(plan.active_plan).to.be.a('string');
};

const checkContestTeamData = (contestTeam, role = 'participant') => {
	// Check for property existence
	expect(contestTeam).to.not.have.property('id');
	expect(contestTeam).to.have.property('ref');
	expect(contestTeam).to.have.property('name');
	expect(contestTeam).to.have.property('description');
	expect(contestTeam).to.have.property('handle');
	expect(contestTeam).to.have.property('type');
	expect(contestTeam).to.have.property('alias');
	expect(contestTeam).to.have.property('admins');
	expect(contestTeam).to.have.property('participants');
	expect(contestTeam).to.have.property('teams');
	expect(contestTeam).to.have.property('collections');
	expect(contestTeam).to.have.property('themes');
	expect(contestTeam).to.have.property('avatar');

	// Check for correct data type
	expect(contestTeam.ref).to.be.a('string');
	expect(contestTeam.name).to.be.a('string');
	expect(contestTeam.description).to.be.a('string');
	expect(contestTeam.handle).to.be.a('string');
	expect(contestTeam.type).to.be.a('string');
	expect(contestTeam.alias).to.be.an('object');
	expect(contestTeam.admins).to.be.an('array');
	expect(contestTeam.participants).to.be.an('array');
	expect(contestTeam.teams).to.be.an('array');
	expect(contestTeam.collections).to.be.an('array');
	expect(contestTeam.themes).to.be.an('array');

	if (contestTeam.avatar) {
		expect(contestTeam.avatar).to.be.a('string');
	}

	if (contestTeam.admins) {
		let admins = contestTeam.admins;
		admins.forEach((participant) => {
			expect(participant).to.have.property('ref');
			expect(participant).to.have.property('name');
			expect(participant).to.have.property('metadata');
		});
	}

	if (contestTeam.participants) {
		let participants = contestTeam.participants;
		participants.forEach((participant) => {
			expect(participant).to.have.property('ref');
			expect(participant).to.have.property('name');
			expect(participant).to.have.property('division');
			expect(participant).to.have.property('role');
			expect(participant).to.have.property('metadata');

			if (role == 'owner' || role == 'admin') {
				expect(participant).to.have.property('email');
			} else {
				expect(participant).to.not.have.property('email');
			}
		});
	}

	if (contestTeam.teams) {
		let divisionTeams = contestTeam.teams;
		divisionTeams.forEach((divisionTeam) => {
			expect(divisionTeam).to.have.property('ref');
			expect(divisionTeam).to.have.property('name');
			expect(divisionTeam).to.have.property('description');
			expect(divisionTeam).to.have.property('handle');
		});
	}

	if (contestTeam.collections) {
		let contestCollections = contestTeam.collections;
		contestCollections.forEach((contestCollection) => {
			expect(contestCollection).to.have.property('ref');
			expect(contestCollection).to.have.property('name');
			expect(contestCollection).to.have.property('theme');
			expect(contestCollection).to.have.property('metadata');
			expect(contestCollection).to.have.property('start_date');
			expect(contestCollection).to.have.property('end_date');
		});
	}
};

const checkContestStatement = async (response, input) => {
	expect(response.marked_impression).to.equal(input.marked_impression);
	expect(response.flag).to.equal(input.flag);
	expect(response.requested).to.equal(input.requested);
	expect(response.extra_a).to.equal(input.extra_a);
	expect(response.extra_b).to.equal(input.extra_b);
	expect(response.extra_c).to.equal(input.extra_c);
	expect(response.extra_d).to.equal(input.extra_d);
	expect(response.extra_e).to.equal(input.extra_e);
	expect(response.metadata).to.deep.equal(input.metadata);
};

const isParticipantAssignedToDivision = (participants, participantRef, divisionRef) => {
	let isAssigned = false;
	let userRole = 'member';

	// Check participant data
	for (let i = 0; i < participants.length; i++) {
		if (participants[i].ref == participantRef && participants[i].division == divisionRef) {
			isAssigned = true;
			userRole = participants[i].role;
			break;
		}
	}

	expect(isAssigned).to.equal(true);
	expect(userRole).to.equal('member');
};

const getContest = async (contestRef) => {
	let options = {...baseGetOptions};
	options.uri = signPath(`/contest/${contestRef}`, 'GET');
	return await request(options);
};

const createContest = async (data = null) => {
	let options = {...basePostOptions};
	options.body = {
		name: makeUniqueString(),
		description: makeUniqueString(100),
		alias: {
			admin: makeUniqueString(),
			leader: makeUniqueString(),
			guide: makeUniqueString(),
			member: makeUniqueString(),
			collection: makeUniqueString(),
			theme: makeUniqueString(),
		},
	};

	if (data) options.body = data;

	options.uri = signPath('/contest/new', 'POST');
	let contest = await createItem(options.uri, options.body);
	return contest;
};

const createContestDivision = async (contestRef, data = null) => {
	let options = {...basePostOptions};
	options.body = {
		name: makeUniqueString(),
		description: makeUniqueString(100),
	};

	if (data) options.body = data;

	options.uri = signPath('/contest/' + contestRef + '/add/team', 'POST');
	let response = await request(options);
	return response.data;
};

const createContestCollection = async (contestRef, data = null) => {
	let options = {...basePostOptions};
	options.body = {
		name: makeUniqueString(),
		description: makeUniqueString(100),
	};

	if (data) options.body = data;

	options.uri = signPath('/contest/' + contestRef + '/add/collection', 'POST');
	let response = await request(options);
	return response.data;
};

const createContestParticipant = async (credentials, contestRef, role = 'participant') => {
	let joinRequest = await generateJoinContestRequest(contestRef, role);
	let participant = joinRequest.user;
	await approveJoinRequest(credentials, contestRef, joinRequest.request.ref);
	return participant;
};

const assignContestCollectionToDivision = async (contestRef, collectionRef, divisionRef) => {
	let options = {...basePostOptions};
	options.uri = signPath(
		`/contest/${contestRef}/collection/${collectionRef}/assign/${divisionRef}`,
		'POST'
	);
	return await request(options);
};

const importImpressionsForContestCollection = async (contestRef, collectionRef) => {
	let options = {...basePostOptions};
	options.uri = signPath(
		`/admin/contest/${contestRef}/collection/${collectionRef}/import/impressions`,
		'POST'
	);

	let filePath = np.join(__dirname, './contest/assets/valid/impressions.json');
	let fileName = np.basename(filePath);
	let type = mime.contentType(fileName);
	let file = fs.createReadStream(filePath);

	delete options.body;
	options.formData = {
		uploadedFile: {
			value: file,
			options: {
				filename: fileName,
				contentType: type,
			},
		},
	};

	let fileStream = fs.readFileSync(filePath, 'utf8');
	let importData = JSON.parse(fileStream);
	let response = await request(options);
	delete options.formData;
	return response.data.impressions;
};

const addContestStatement = async (contestRef, collectionRef, impressionRef, data = null) => {
	let options = {...basePostOptions};
	options.uri = signPath(
		`/contest/${contestRef}/collection/${collectionRef}/subject/${impressionRef}/statement`,
		'POST'
	);

	options.body = {
		marked_impression: null,
		flag: true,
		requested: true,
		statement: makeUniqueString(),
		extra_a: makeUniqueString(),
		extra_b: makeUniqueString(),
		extra_c: makeUniqueString(),
		extra_d: makeUniqueString(),
		extra_e: makeUniqueString(),
		metadata: {
			medal: 'gold',
		},
	};

	if (data) options.body = data;

	let response = await request(options);
	return response.data;
};

const addContestDivisionStatement = async (
	contestRef,
	collectionRef,
	divisionRef,
	impressionRef,
	data = null
) => {
	let options = {...basePostOptions};

	options.uri = signPath(
		`/contest/${contestRef}/collection/${collectionRef}/team/${divisionRef}/subject/${impressionRef}/statement`,
		'POST'
	);

	options.body = {
		marked_impression: impressionRef,
		flag: true,
		requested: true,
		statement: makeUniqueString(),
		extra_a: makeUniqueString(),
		extra_b: makeUniqueString(),
		extra_c: makeUniqueString(),
		extra_d: makeUniqueString(),
		extra_e: makeUniqueString(),
		metadata: {
			medal: 'gold',
		},
	};

	if (data) options.body = data;

	let response = await request(options);
	return response.data.statements;
};

const createSubjectImpression = async (creds, subject) => {
	await login(creds.email, creds.rawPass);
	let options = {...basePostOptions};
	options.uri = signPath(`/tasting`, 'POST');

	options.body = {
		name: makeUniqueString(),
		mold: subject.ref,
	};
	return await request(options);
};

const createSubjectsImpressionsForUser = async (creds, subjects) => {
	let impressions = [];

	for (let i = 0; i < subjects.length; i++) {
		let impression = await createSubjectImpression(creds, subjects[i]);
		impressions.push(impression.data);
	}

	return impressions;
};

let addContestStatementsToSubjects = async (
	contestTeamRef,
	collectionRef,
	collectionSubjects,
	statement = null
) => {
	let collectionStatements = [];

	// Add two gold and one silver statements to collectionCava for testing
	for (let i = 0; i < collectionSubjects.length; i++) {
		collectionStatements = await addContestStatement(
			contestTeamRef,
			collectionRef,
			collectionSubjects[i].ref,
			statement
		);
	}

	return collectionStatements;
};

const addDivisionStatement = async (
	contestRef,
	collectionRef,
	divisionRef,
	impressionRef,
	data = null
) => {
	let options = {...basePostOptions};
	options.uri = signPath(
		`/contest/${contestRef}/collection/${collectionRef}/team/${divisionRef}/subject/${impressionRef}/statement`,
		'POST'
	);

	options.body = {
		marked_impression: null,
		flag: true,
		requested: true,
		statement: makeUniqueString(),
		extra_a: makeUniqueString(),
		extra_b: makeUniqueString(),
		extra_c: makeUniqueString(),
		extra_d: makeUniqueString(),
		extra_e: makeUniqueString(),
		metadata: {
			medal: 'gold',
		},
	};

	if (data) options.body = data;

	let response = await request(options);

	return response.data.statements;
};

let addDivisionStatementsToSubjects = async (
	contestTeamRef,
	collectionRef,
	divisionRef,
	collectionSubjects,
	statement = null
) => {
	let collectionStatements = [];

	// Add two gold and one silver statements to collectionCava for testing
	for (let i = 0; i < collectionSubjects.length; i++) {
		collectionStatements = await addContestDivisionStatement(
			contestTeamRef,
			collectionRef,
			divisionRef,
			collectionSubjects[i].ref,
			statement
		);
	}

	return collectionStatements;
};

function uc1(str) {
	if (str === undefined || str.length <= 0) {
		return;
	}

	return str.slice(0, 1).toString().toUpperCase() + str.slice(1);
}

let createJsonFile = async (filePath, data) => {
	let buffer = Buffer.from(JSON.stringify(data));
	fs.writeFileSync(filePath, buffer);
};

let createTraditionalImpression = async (data = null) => {
	let options = {...basePostOptions};
	options.body = {
		name: makeUniqueString(),
	};

	if (data) options.body = data;

	options.uri = signPath('/tasting', 'POST');
	return await createItem(options.uri, options.body);
};

let createTraditionalTeam = async (data = null) => {
	let options = {...basePostOptions};
	options.body = {
		handle: makeUniqueString(),
		name: makeUniqueString(),
		description: makeUniqueString(),
		city: makeUniqueString(),
		country: 'DK',
		visibility: 'public',
	};

	if (data) options.body = data;

	options.uri = signPath('/team', 'POST');
	return await createItem(options.uri, options.body);
};

let createTraditionalCollection = async (data = null) => {
	let options = {...basePostOptions};
	options.body = {
		name: makeUniqueString(),
		description: 'Event description',
		visibility: 'private',
		start_date: '2019-01-14 14:23:28',
		end_date: '2019-01-20 19:23:28',
		sub_type: 'blind',
	};

	if (data) options.body = {...options.body, ...data};

	options.uri = signPath('/event', 'POST');
	return await createItem(options.uri, options.body);
};

let addMetadataToContestUser = async (collectionRef, userRef, data) => {
	let options = {...basePostOptions};

	options.body = {
		metadata: JSON.stringify({field: 'test sample'}),
	};

	if (data) options.body = data;

	options.uri = signPath(`/contest/${collectionRef}/user/${userRef}/metadata`, 'POST');

	let response = await request(options);
};

let getContestUserMetadata = async (collectionRef, userRef) => {
	let options = {...baseGetOptions};
	options.uri = signPath(`/contest/${collectionRef}/user/${userRef}/metadata`, 'GET');
	let response = await request(options);
	return response.data.metadata;
};

const inviteUserToTeam = async (team, teamOwner, userToInvite, role = 'member') => {
	await login(teamOwner.email, teamOwner.rawPass);
	let options = {...basePostOptions};
	options.body = {
		invitees: [userToInvite.ref],
	};
	options.uri = signPath(`/team/${team.ref}/invite/role/${role}`, 'POST');
	let response = await request(options);
	return response;
};

const getBackendTime = async (additionalMinutes = 1) => {
	let options = {...basePostOptions};

	// Prepare Payload
	options.transform = null;
	options.method = 'POST';
	options.uri = signPath('/event', 'POST');
	options.body = {
		name: makeUniqueString(),
		description: 'Event description',
		visibility: 'private',
		start_date: '2019-01-14 14:23:28',
		end_date: '2019-01-20 19:23:28',
		sub_type: 'blind',
	};

	// Create Dummy
	let dummyEvent = await request(options);
	let backendTime = dummyEvent.data.created_at;
	let consoleTimeStamp = Date.parse(backendTime);

	// Convert the timestamp to date
	var consoleTime = new Date(consoleTimeStamp);

	// Add Minutes
	consoleTime.setMinutes(consoleTime.getMinutes() + additionalMinutes);

	// Format js date to backend acceptable date
	consoleTime = dateFormat(consoleTime, 'yyyy-mm-dd HH:MM:ss');

	return consoleTime;
};

const sleep = async (ms) => {
	return new Promise((resolve) => {
		console.log('\t\x1b[41m%s\x1b[0m', `Waiting for ${ms}ms`);
		setTimeout(resolve, ms);
	});
};

// Common Vars
exports.PORT = PORT;
exports.baseUrl = baseUrl;
exports.basePostOptions = basePostOptions;
exports.baseGetOptions = baseGetOptions;
exports.baseDeleteOptions = baseDeleteOptions;

// Common Functions
exports.createItem = createItem;
exports.createUser = createUser;
exports.getItem = getItem;
exports.checkCreateStatusCode = checkCreateStatusCode;
exports.checkStatusCodeByOptions = checkStatusCodeByOptions;
exports.checkForSuccess = checkForSuccess;
exports.makeRandomInt = makeRandomInt;
exports.makeUniqueString = makeUniqueString;
exports.makeIsoDateString = makeIsoDateString;
exports.generateUserData = generateUserData;
exports.signPath = signPath;
exports.getUserSpecs = getUserSpecs;
exports.login = login;
exports.likeOrFollowTeam = likeOrFollowTeam;
exports.sha256 = sha256;
exports.md5 = md5;
exports.validMD5 = validMD5;
exports.signPathStatic = signPathStatic;
exports.randomBool = randomBool;
exports.randomPhone = randomPhone;
exports.randomSocialUrl = randomSocialUrl;
exports.randomDOB = randomDOB;
exports.checkProps = checkProps;
exports.checkPropsVal = checkPropsVal;
exports.checkUserProfile = checkUserProfile;
exports.deprecateNotes = deprecateNotes;
exports.activateNotes = activateNotes;
exports.getFormattedDate = getFormattedDate;
exports.generateJoinRequest = generateJoinRequest;
exports.generateJoinContestRequest = generateJoinContestRequest;
exports.requestToJoinContest = requestToJoinContest;
exports.requestToJoinTraditionalTeam = requestToJoinTraditionalTeam;
exports.approveJoinRequest = approveJoinRequest;
exports.assignParticipantToDivision = assignParticipantToDivision;
exports.assignParticipantDivisionRole = assignParticipantDivisionRole;
exports.createDivisionMemberWithRole = createDivisionMemberWithRole;
exports.generateChargifyToken = generateChargifyToken;
exports.checkUserPlan = checkUserPlan;
exports.checkVoucherData = checkVoucherData;
exports.checkContestTeamData = checkContestTeamData;
exports.checkContestStatement = checkContestStatement;
exports.isParticipantAssignedToDivision = isParticipantAssignedToDivision;
exports.getContest = getContest;
exports.createContest = createContest;
exports.createContestDivision = createContestDivision;
exports.createContestCollection = createContestCollection;
exports.createContestParticipant = createContestParticipant;
exports.assignContestCollectionToDivision = assignContestCollectionToDivision;
exports.importImpressionsForContestCollection = importImpressionsForContestCollection;
exports.addContestStatement = addContestStatement;
exports.addContestDivisionStatement = addContestDivisionStatement;
exports.addContestStatementsToSubjects = addContestStatementsToSubjects;
exports.addDivisionStatement = addDivisionStatement;
exports.addDivisionStatementsToSubjects = addDivisionStatementsToSubjects;
exports.createJsonFile = createJsonFile;
exports.sleep = sleep;
exports.getBackendTime = getBackendTime;
exports.createTraditionalImpression = createTraditionalImpression;
exports.createTraditionalTeam = createTraditionalTeam;
exports.createTraditionalCollection = createTraditionalCollection;
exports.addMetadataToContestUser = addMetadataToContestUser;
exports.getContestUserMetadata = getContestUserMetadata;
exports.createSubjectImpression = createSubjectImpression;
exports.createSubjectsImpressionsForUser = createSubjectsImpressionsForUser;
exports.inviteUserToTeam = inviteUserToTeam;
