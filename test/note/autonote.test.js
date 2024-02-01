const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	login,
	signPath,
	generateUserData,
	makeUniqueString,
	createItem,
	checkStatusCodeByOptions,
	checkForSuccess,
} = require('../common.js');

describe('Note', () => {
	let options, baseUserPath, user, userData;

	before(async () => {
		options = {...basePostOptions};
		baseUserPath = baseUrl + '/user';

		// Create user
		user = generateUserData();
		user.name = makeUniqueString();
		user.handle = makeUniqueString();
		userData = await createItem(baseUserPath, user);
		user.ref = userData.data.ref;

		// Simulate login for user
		await login(user.email, user.rawPass);
	});

	describe('auto note', () => {
		beforeEach(async () => {
			options.transform = null;
			options.body = {
				lang: 'en',
				notes: [
					'category_sparkling',
					'nuance_red',
					'nuance_tawny',
					'clarity_hazy',
					'colorintensity_pale',
					'condition_unclean',
					'noseintensity_mediumminus',
					'development_developing',
					'note_pastry',
					'sweetness_mediumdry',
					'acidity_mediumplus',
					'tannins_medium',
					'alcohol_medium',
					'body_mediumplus',
					'mousse_delicate',
					'palateintensity_mediumminus',
					'finish_mediumminus',
					'palatenote_chamomile',
					'palatenote_pastry',
					'quality_verygood',
					'readiness_suitableforbottleageing',
				],
			};
			options.uri = signPath('/autonote', 'POST');
		});

		// Positive Tests

		it('should return correct success status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful', async () => {
			let response = await request(options);
			checkForSuccess(response);
		});

		it('should return proper data', async () => {
			let autoNote = await request(options);
			expect(autoNote).to.not.have.property('id');
			expect(autoNote).to.have.property('status');
			expect(autoNote).to.have.property('message');
			expect(autoNote.message).to.satisfy(function (message) {
				let commonwords = ['wine', 'nose', 'legs', 'aromas', 'flavour', 'alcohol'];

				return message.includes('wine');
			});
		});

		it('should return proper data when fetching a specific template', async () => {
			//Get All Templates
			options.body.template = -1;
			let allTemplates = await request(options);

			//Test All Individual Templates
			let template = 0;
			for (template = 1; template <= 15; template++) {
				options.uri = signPath('/autonote', 'POST');
				options.body.template = 1;
				let autoNote = await request(options);
				expect(autoNote).to.not.have.property('id');
				expect(autoNote).to.have.property('status');
				expect(autoNote).to.have.property('message');
				expect(autoNote.message).to.satisfy(function (message) {
					return allTemplates.message.includes(message);
				});
			}
		});

		it('should return random template when template parameter is zero/empty', async () => {
			let template = 0;
			let sameTemplates = false;
			let templateReps = [];

			//Zero Test
			for (template = 1; template <= 15; template++) {
				options.uri = signPath('/autonote', 'POST');
				options.body.template = 0;
				let autoNote = await request(options);

				expect(autoNote).to.not.have.property('id');
				expect(autoNote).to.have.property('status');
				expect(autoNote).to.have.property('message');
				expect(autoNote.message).to.satisfy(function (message) {
					return message.includes('wine');
				});

				templateReps[template] = autoNote.message;
			}

			sameTemplates = templateReps.filter((v, i, a) => v === a[0]).length === templateReps.length;
			expect(sameTemplates).to.not.equal(true);
		});

		it('should return random template when template parameter is empty', async () => {
			let template = 0;
			let sameTemplates = false;
			let templateReps = [];

			//Empty Test
			for (template = 1; template <= 15; template++) {
				options.uri = signPath('/autonote', 'POST');
				options.body.template = null;
				let autoNote = await request(options);

				expect(autoNote).to.not.have.property('id');
				expect(autoNote).to.have.property('status');
				expect(autoNote).to.have.property('message');
				expect(autoNote.message).to.satisfy(function (message) {
					return message.includes('wine');
				});

				templateReps[template] = autoNote.message;
			}

			sameTemplates = templateReps.filter((v, i, a) => v === a[0]).length === templateReps.length;
			expect(sameTemplates).to.not.equal(true);
		});

		it('should return proper data when fetching all templates', async () => {
			options.body.template = -1;
			let autoNote = await request(options);
			expect(autoNote).to.not.have.property('id');
			expect(autoNote).to.have.property('status');
			expect(autoNote).to.have.property('message');
			expect(autoNote.message).to.satisfy(function (message) {
				return message.includes('----');
			});
		});

		it('should replace all variables', async () => {
			let notes = {
				// category_
				category_still: 'Still',
				// clarity_
				clarity_clear: 'Clear',
				// colorintensity_
				colorintensity_deep: 'Deep',
				// nuance_
				nuance_amber: 'Amber',
				// condition_
				condition_clean: 'Clean',
				// development_
				development_developing: 'Developing',
				// sweetness_
				sweetness_medium: 'Medium',
				// acidity_
				acidity_high: 'High',
				// tannins_
				tannins_high: 'High',
				// alcohol_
				alcohol_high: 'High',
				// body_
				body_full: 'Full',
				// finish_
				finish_long: 'Long',
				// noseintensity_
				noseintensity_light: 'Light',
				// nose_
				note_acacia: 'Acacia',
				note_acetaldehyde: 'Acetaldehyde',
				// palateintensity_
				palateintensity_light: 'Light',
				// palate_
				note_almond: 'Almond',
				note_apple: 'Apple',
			};

			// Payload
			options.body.notes = Object.keys(notes);

			// Fetch all templates
			options.uri = signPath('/autonote', 'POST');
			options.body.template = -1;
			let response = await request(options);

			for (let i = 0; i < notes.length; i++) {
				let note = notes[i].toLowerCase();
				expect(response.message.includes(note)).to.equal(true);
			}

			// Practical, Template #3 has 15 known vars , only lacking category_
			options.uri = signPath('/autonote', 'POST');
			options.body.template = 3;
			response = await request(options);
			for (let i = 1; i < notes.length; i++) {
				let note = notes[i].toLowerCase();
				expect(response.message.includes(note)).to.equal(true);
			}

			// Test for category_ , see comment above
			options.uri = signPath('/autonote', 'POST');
			options.body.template = 5;
			response = await request(options);
			let note = notes['category_still'].toLowerCase();
			expect(response.message.includes(note)).to.equal(true);
		});

		// Negative Tests

		it('should fail if template index does not exist', async () => {
			options.body.template = 55;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should fail if template index has invalid format', async () => {
			options.body.template = 'template';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if payload is empty', async () => {
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if lang is empty', async () => {
			options.body.lang = null;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error for langs other than en', async () => {
			let invalidLangs = ['da', 'ch', 'es'];

			const _validateLang = async (lang) => {
				options.uri = signPath('/autonote', 'POST');
				options.body.lang = lang;
				await checkStatusCodeByOptions(options, 400);
			};

			for (const lang of invalidLangs) {
				await _validateLang(lang);
			}
		});

		it('should return error if notes is empty', async () => {
			options.body.notes = [];
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
