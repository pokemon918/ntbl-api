const expect = require('chai').expect;
const request = require('request-promise');
const cloneDeep = require('lodash').cloneDeep;

const {
	baseUrl,
	basePostOptions,
	createItem,
	checkCreateStatusCode,
	checkForSuccess,
	deprecateNotes,
	activateNotes,
	login,
	signPath,
	generateUserData,
} = require('../common.js');

describe('Tasting', () => {
	describe('create with impression note', () => {
		let options,
			path,
			baseData,
			tastingResponse,
			veryVeryLongText,
			validNoteTypes,
			validNotes,
			user;

		before(async () => {
			options = {...basePostOptions};

			//User
			let createUserPath = baseUrl + '/user';
			user = generateUserData();
			await createItem(createUserPath, user);
			await login(user.email, user.rawPass);

			path = signPath('/tasting', 'POST');
			validNoteTypes = ['@', 'nose', 'palate'];
			validNotes = {
				'@': [
					'category_still',
					'nuance_rose',
					'nuance_orange',
					'clarity_hazy',
					'colorintensity_deep',
				],
				nose: [
					'condition_clean',
					'noseintensity_mediumplus',
					'development_fullydeveloped',
					'note_acacia',
					'note_chamomile',
					'note_violet',
					'note_tomato_leaf',
					'note_asparagus',
				],
				palate: [
					'condition_clean',
					'noseintensity_mediumplus',
					'development_fullydeveloped',
					'note_acacia',
					'note_chamomile',
					'note_violet',
					'note_tomato_leaf',
					'note_asparagus',
				],
			};

			baseData = {
				name: 'Test Tasting',
				notes: validNotes,
			};
			tastingResponse = await createItem(path, baseData);
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			path = signPath('/tasting', 'POST');
		});

		it('should return correct status code', async () => {
			let response = await createItem(path, baseData, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful', async () => {
			checkForSuccess(tastingResponse);
		});

		it('should be successful when adding note keys with no type [@]', async () => {
			let data = cloneDeep(baseData);
			data.notes['@'] = ['quality_acceptable', 'readiness_notsuitableforbottleageing'];
			let response = await createItem(path, data, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful notes is empty [null]', async () => {
			let data = cloneDeep(baseData);
			data.notes = null;
			let response = await createItem(path, data, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful notes is empty [array]', async () => {
			let data = cloneDeep(baseData);
			data.notes = [];
			let response = await createItem(path, data, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful notes is empty [object]', async () => {
			let data = cloneDeep(baseData);
			data.notes = {};
			let response = await createItem(path, data, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should be successful notes is empty [string]', async () => {
			let data = cloneDeep(baseData);
			data.notes = '';
			let response = await createItem(path, data, true);
			expect(response.statusCode).to.equal(201);
		});

		it('should create actual impression note keys in db', async () => {
			// Test tastingResponse first
			expect(tastingResponse).to.have.property('data');
			expect(tastingResponse.data).to.not.have.property('id');
			expect(tastingResponse.data.ref).to.be.a('string').that.have.lengthOf.above(0);

			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + tastingResponse.data.ref, 'GET');
			let tasting = await request(options);

			// Test only for individual data
			expect(tasting).to.have.property('notes');
			expect(tasting.notes).to.be.an('object');

			validNoteTypes.forEach((type) => {
				let notes = tasting.notes;
				expect(notes).to.have.property(type);

				// Sort before Matching
				notes[type].sort();
				validNotes[type].sort();
				expect(notes[type]).to.deep.eql(validNotes[type]);
			});
		});

		it('should return an error if notes is not an object [string]', async () => {
			let data = {
				name: 'Test Tasting',
				notes: 'shouldbeobject',
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if notes is not an object [int]', async () => {
			let data = {
				name: 'Test Tasting',
				notes: 123,
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if notes is not an object [float]', async () => {
			let data = {
				name: 'Test Tasting',
				notes: 100.4324,
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if notes is not an object [array]', async () => {
			let data = {
				name: 'Test Tasting',
				notes: ['key1', 'key2', 'key3'],
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if notes is sent as an array even if keys are valid', async () => {
			let data = {
				name: 'Test Tasting',
				notes: [
					'category_still',
					'nuance_rose',
					'nuance_orange',
					'clarity_hazy',
					'colorintensity_deep',
				],
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if note is a number', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					palate: [1],
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if a note is not a string', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					palate: ['testkey1', 456],
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if a note has html <>', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					palate: ['<p>paragraph</p>', '<img />'],
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if a note has non printable chars', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					palate: ['testkey1', 'testkey\t2', 'testkey\r3'],
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if a note type is invalid', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					invalid_note_type: ['testval1', 'testval2', 'testval3'],
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if the notes property/object has more than 12 keys', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					type1: ['testval1', 'testval2', 'testval3'],
					type2: ['testval1', 'testval2', 'testval3'],
					type3: ['testval1', 'testval2', 'testval3'],
					type4: ['testval1', 'testval2', 'testval3'],
					type5: ['testval1', 'testval2', 'testval3'],
					type6: ['testval1', 'testval2', 'testval3'],
					type7: ['testval1', 'testval2', 'testval3'],
					type8: ['testval1', 'testval2', 'testval3'],
					type9: ['testval1', 'testval2', 'testval3'],
					type10: ['testval1', 'testval2', 'testval3'],
					type11: ['testval1', 'testval2', 'testval3'],
					type12: ['testval1', 'testval2', 'testval3'],
					type13: ['testval1', 'testval2', 'testval3'],
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if a note type is valid but the value is not an array', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					palate: 'not_an_array',
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if a note type is valid but one of the values is a non-existing note key', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					palate: ['category_still', 'nuance_orange', 'not_an_existing_key'],
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if a note type is valid but one of the values is a deprecated note key', async () => {
			// deprecate one of the notes first
			let keyToDeprecate = {notes: ['nuance_orange']};
			await deprecateNotes(keyToDeprecate);

			// include a deprecated not in the create tasting payload
			let data = {
				name: 'Test Tasting',
				notes: {
					palate: ['category_still', 'nuance_orange'],
				},
			};
			await checkCreateStatusCode(path, data, 400);

			// clean up: make sure to re-activate the deprecated note again
			await activateNotes(keyToDeprecate);
		});

		it('should return an error if a note type is valid but one of the values is invalid', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					palate: ['category_still', 'nuance_orange', '#$!#^$*()-=@'],
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});

		it('should return an error if a note key has reached the max chars limit of 255', async () => {
			let data = {
				name: 'Test Tasting',
				notes: {
					palate: ['category_still', 'nuance_orange', 'a'.repeat(256)],
				},
			};
			await checkCreateStatusCode(path, data, 400);
		});
	});
});
