const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	basePostOptions,
	getItem,
	createItem,
	checkCreateStatusCode,
	checkForSuccess,
	checkStatusCodeByOptions,
	makeUniqueString,
	deprecateNotes,
	activateNotes,
	login,
	signPath,
} = require('../common.js');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
let user = {};

const testTastingData = async (tastingToEdit) => {
	expect(tastingToEdit).to.have.property('data');
	expect(tastingToEdit.data.ref).to.be.a('string').that.have.lengthOf.above(0);
	expect(tastingToEdit).to.not.have.property('gps');
};

const getRawData = async (options, ref) => {
	options.method = 'GET';
	options.uri = signPath('/raw/impression/' + ref);
	let tasting = await request(options);
	return tasting;
};

const generateUserData = () => {
	user.email = 'email_' + makeUniqueString() + '@ntbl-api.com';
	user.rawPass = '1q1q';
	return getAuthCreationPayload(user.rawPass, user.email);
};

describe('Tasting', () => {
	describe('edit and update by ref', () => {
		let options,
			editTastingPath,
			baseData,
			tastingToEdit,
			user1Ref,
			user2Ref,
			testTasting,
			validNotes,
			validNoteTypes,
			checkProperRatingData;

		before(async () => {
			// Create user1
			let path = baseUrl + '/user';
			let data = generateUserData();
			let response = await createItem(path, data);
			user1Ref = response.data.ref; // save userRef for the next test

			// Simulate login
			await login(user.email, user.rawPass);

			// Create a tasting for testing edit/update
			options = {...basePostOptions};
			baseData = {name: 'test_name'};
			tastingToEdit = await createItem(signPath('/tasting', 'POST'), baseData);
			editTastingPath = '/tasting/' + tastingToEdit.data.ref;
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

			checkProperRatingData = (tasting, inputRating) => {
				expect(tasting).to.not.have.property('id');
				expect(tasting).to.have.property('rating');
				expect(tasting.rating.impression_id).to.be.a('number');

				expect(tasting.rating.version).to.equal(inputRating.version);
				expect(parseFloat(tasting.rating.final_points).toFixed(9)).to.equal(
					parseFloat(88).toFixed(9)
				);
				expect(parseFloat(tasting.rating.balance).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
				expect(parseFloat(tasting.rating.length).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
				expect(parseFloat(tasting.rating.intensity).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
				expect(parseFloat(tasting.rating.terroir).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
				expect(parseFloat(tasting.rating.complexity).toFixed(9)).to.equal(parseFloat(1).toFixed(9));
			};
		});

		beforeEach(async () => {
			options.transform = null;
			options.method = 'POST';
			options.body = baseData;
			options.uri = signPath(editTastingPath, 'POST');
		});

		it('should return correct status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful', async () => {
			checkForSuccess(tastingToEdit);
		});

		it('should be successful even with [trimmable] characters in fields', async () => {
			options.body = {
				name: '\nnew tasting name\n',
			};

			let response = await createItem(options.uri, options.body, true);
			expect(response.statusCode).to.equal(200);
		});

		/* Make sure that no other fields are mandatory */

		it('should be successful when updating tasting name alone', async () => {
			// Edit and update tasting name
			options.body = {
				name: 'new tasting name',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('name').to.be.a('string');
			expect(rawTasting.subject.name).to.equal('new tasting name');
		});

		it('should be successful even with [trimmable] characters in name', async () => {
			options.body = {
				name: '\ntest_name\n',
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('name').to.be.a('string');
			expect(rawTasting.subject.name).to.equal(options.body.name.trim());
		});

		it('should be successful when updating tasting origin alone', async () => {
			// Edit and update tasting origin
			options.body = {
				source: 'quick/web/2.0.1-rc+3456',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.origin).to.have.property('flow');
			expect(rawTasting.origin).to.have.property('client');
			expect(rawTasting.origin).to.have.property('version');
			expect(rawTasting.origin.flow).to.equal('quick');
			expect(rawTasting.origin.client).to.equal('web');
			expect(rawTasting.origin.version).to.equal('2.0.1-rc+3456');
			expect(parseInt(rawTasting.origin.version)).to.equal(2);
		});

		it('should be successful when updating tasting producer alone', async () => {
			// Edit and update tasting producer
			options.body = {
				producer: 'new producer',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('producer');
			expect(rawTasting.subject.producer).to.equal('new producer');
		});

		it('should be successful when updating tasting country alone', async () => {
			// Edit and update tasting country
			options.body = {
				country: 'new country',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('country');
			expect(rawTasting.subject.country).to.equal('new country');
		});

		it('should be successful when updating tasting region alone', async () => {
			// Edit and update tasting region
			options.body = {
				region: 'new region',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('region');
			expect(rawTasting.subject.region).to.equal('new region');
		});

		it('should be successful when updating tasting vintage alone', async () => {
			// Edit and update tasting vintage
			options.body = {
				vintage: 'new vintage',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('vintage');
			expect(rawTasting.subject.vintage).to.equal('new vintage');
		});

		it('should be successful when updating tasting grape alone', async () => {
			// Edit and update tasting grape
			options.body = {
				grape: 'new grape',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('grape');
			expect(rawTasting.subject.grape).to.equal('new grape');
		});

		it('should be successful when updating tasting [price] alone in numeric [string] form', async () => {
			// Edit and update tasting price
			options.body = {
				price: '100',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('price');
			expect(rawTasting.subject.price).to.equal('100.0000');
		});

		it('should be successful when updating tasting [price] alone in numeric [int] form', async () => {
			// Edit and update tasting price
			options.body = {
				price: 100,
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('price');
			expect(rawTasting.subject.price).to.equal('100.0000');
		});

		it('should be successful when updating tasting [currency] alone', async () => {
			// Edit and update tasting currency
			options.body = {
				currency: 'USD',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('currency');
			expect(rawTasting.subject.currency).to.equal('USD');
		});

		it('should be successful if subject currency is equal to max(16) chars', async () => {
			options.body = {
				currency: 'a'.repeat(16),
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('currency');
			expect(rawTasting.subject.currency).to.equal(options.body.currency);
		});

		it('should be successful when updating tasting [clean_key] alone', async () => {
			// Edit and update tasting clean_key
			options.body = {
				clean_key: 'clean',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('clean_key');
			expect(rawTasting.subject.clean_key).to.equal(options.body.clean_key);
		});

		it('should be successful when [clean_key] reached max chars of 64', async () => {
			// Edit and update tasting clean_key
			options.body = {
				clean_key: 'a'.repeat(64),
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('clean_key');
			expect(rawTasting.subject.clean_key).to.equal(options.body.clean_key);
		});

		it('should be successful when updating tasting [producer_key] alone', async () => {
			// Edit and update tasting producer_key
			options.body = {
				producer_key: 'producer',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('producer_key');
			expect(rawTasting.subject.producer_key).to.equal(options.body.producer_key);
		});

		it('should be successful when [producer_key] reached max chars of 64', async () => {
			// Edit and update tasting producer_key
			options.body = {
				producer_key: 'a'.repeat(64),
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('producer_key');
			expect(rawTasting.subject.producer_key).to.equal(options.body.producer_key);
		});

		it('should be successful when updating tasting [country_key] alone', async () => {
			// Edit and update tasting country_key
			options.body = {
				country_key: 'country',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('country_key');
			expect(rawTasting.subject.country_key).to.equal(options.body.country_key);
		});

		it('should be successful when [country_key] reached max chars of 64', async () => {
			// Edit and update tasting country_key
			options.body = {
				country_key: 'a'.repeat(64),
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('country_key');
			expect(rawTasting.subject.country_key).to.equal(options.body.country_key);
		});

		it('should be successful when updating tasting [region_key] alone', async () => {
			// Edit and update tasting region_key
			options.body = {
				region_key: 'region',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('region_key');
			expect(rawTasting.subject.region_key).to.equal(options.body.region_key);
		});

		it('should be successful when [region_key] reached max chars of 64', async () => {
			// Edit and update tasting region_key
			options.body = {
				region_key: 'a'.repeat(64),
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.subject).to.have.property('region_key');
			expect(rawTasting.subject.region_key).to.equal(options.body.region_key);
		});

		it('should be successful when updating tasting summary_wine alone', async () => {
			// Edit and update tasting summary_wine
			options.body = {
				summary_wine: 'this is the new wine summary',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.individual).to.have.property('summary_wine');
			expect(rawTasting.individual.summary_wine).to.equal('this is the new wine summary');
		});

		it('should be successful when updating tasting summary_personal alone', async () => {
			// Edit and update tasting summary_personal
			options.body = {
				summary_personal: 'this is the new personal summary',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.individual).to.have.property('summary_personal');
			expect(rawTasting.individual.summary_personal).to.equal('this is the new personal summary');
		});

		it('should be successful when updating tasting location alone', async () => {
			// Edit and update tasting location
			options.body = {
				location: makeUniqueString(),
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.individual).to.have.property('location');
			expect(rawTasting.individual.location).to.equal(options.body.location);
		});

		it('should be successful when updating tasting gps alone', async () => {
			// Edit and update tasting gps
			options.body = {
				gps: {
					lat: 90,
					long: 180,
				},
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.individual).to.have.property('lat');
			expect(rawTasting.individual).to.have.property('long');
			expect(parseInt(rawTasting.individual.lat)).to.equal(options.body.gps.lat);
			expect(parseInt(rawTasting.individual.long)).to.equal(options.body.gps.long);
		});

		// more #gps tests

		it('should be able to save [negative] [lat] and [long] values', async () => {
			// Test tastingResponse first
			options.body = {
				gps: {
					lat: -90,
					long: -180,
				},
			};

			let recentlyEditedTasting = await request(options);
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.individual.lat).to.equal('-90.0000000000000');
			expect(rawTasting.individual.long).to.equal('-180.0000000000000');
		});

		it('should not round off [lat] and [long] within [decimal][16,13]', async () => {
			/* 
				Our Column consists of 16 digits with 13 decimal places.

				This means that for [lat], our values can range from 
				-90.0000000000000 to +90.0000000000000 
				(with regards to validation , the total digits above are only up to 15)

				and for [long], our values can range from 
				-180.0000000000000 to +180.0000000000000
			*/

			options.body = {
				gps: {
					lat: '-89.1234567890123',
					long: '-179.1234567890123',
				},
			};

			let recentlyEditedTasting = await request(options);
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.individual.lat).to.equal('-89.1234567890123');
			expect(rawTasting.individual.long).to.equal('-179.1234567890123');
		});

		it('should be successful when updating tasting food_pairing alone', async () => {
			// Edit and update tasting food_pairing
			options.body = {
				food_pairing: 'this is the new food pairing',
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.individual).to.have.property('food_pairing');
			expect(rawTasting.individual.food_pairing).to.equal('this is the new food pairing');
		});

		it('should be successful when updating tasting stats alone', async () => {
			// Edit and update tasting stats
			options.body = {
				stats: [
					{
						stat1: '1',
					},
					{
						stat2: '2',
					},
				],
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);

			expect(rawTasting.stats).to.be.an('array');
			expect(rawTasting.stats[0]).to.have.property('event');
			expect(rawTasting.stats[0]).to.have.property('value');
			expect(rawTasting.stats[1]).to.have.property('event');
			expect(rawTasting.stats[1]).to.have.property('value');

			expect(rawTasting.stats[0].event).to.equal('stat1');
			expect(rawTasting.stats[0].value).to.equal(1);

			expect(rawTasting.stats[1].event).to.equal('stat2');
			expect(rawTasting.stats[1].value).to.equal(2);
		});

		it('should be successful when updating tasting metadata alone', async () => {
			// try and add some metadata
			options.body = {
				metadata: JSON.stringify({medal: 'gold'}),
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.metadata).to.be.an('object');
		});

		it('should be successful when updating tasting metadata alone as array', async () => {
			// try and add some metadata
			options.body = {
				metadata: JSON.stringify([{medal: 'gold'}, {notes: 'This tasting is good'}]),
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.metadata).to.be.an('array');
		});

		it('should be successful when updating tasting metadata[hjson]', async () => {
			// No quotes , no comma, trailing comma
			options.body = {
				metadata: "{medal_page:true \n 'views': 1000 , }",
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.metadata).to.be.an('object');
		});

		it('should be successful when updating tasting metadata[json]', async () => {
			// Json Object
			options.body = {
				metadata: {medal_page: true, views: 1000},
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.metadata).to.be.an('object');
		});

		it('should be successful when updating tasting info alone', async () => {
			// try and add some info
			options.body = {
				info: {
					shape: 'tall',
					height: 3.5,
				},
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.info).to.be.an('object');
			expect(rawTasting.info).to.deep.equal(options.body.info);
		});

		it('should be successful when updating tasting [mold] alone', async () => {
			// Create a mold
			options.body = baseData;
			options.method = 'POST';
			options.uri = signPath('/tasting', 'POST');
			let tasting = await request(options);

			// Mold an impression after it
			options.body = {
				mold: tasting.data.ref,
			};
			options.uri = signPath(editTastingPath, 'POST');
			let tastingWithMold = await request(options);
			testTastingData(tastingWithMold);
			expect(tastingWithMold.data.mold).to.equal(tasting.data.ref);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, tastingWithMold.data.ref);
			expect(rawTasting.impression.mold).to.be.an('string');
			expect(rawTasting.impression.mold).to.equal(options.body.mold);
		});

		/* Make sure notes are not affected */

		it('should be successful when updating tasting notes alone', async () => {
			// Try and add some notes
			options.body = {
				notes: validNotes,
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting).to.have.property('notes');
			expect(rawTasting.notes).to.be.an('object');

			validNoteTypes.forEach((type) => {
				let notes = rawTasting.notes;
				expect(notes).to.have.property(type);

				// Sort before Matching
				notes[type].sort();
				validNotes[type].sort();
				expect(notes[type]).to.deep.eql(validNotes[type]);
			});
		});

		it('should not save duplicate notes if duplicated in the payload', async () => {
			let duplicateNotes = {
				'@': [
					'category_still',
					'nuance_rose',
					'nuance_orange',
					'clarity_hazy',
					'colorintensity_deep',
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

			// Add duplicate notes
			options.body = {
				notes: duplicateNotes,
			};

			// Save the notes multiple times
			let recentlyEditedTasting = null;
			recentlyEditedTasting = await request(options);

			// Transform object into array
			let updatedNotes = Object.values(recentlyEditedTasting.data.notes);

			// Navigate through each note category
			for (let i = 0; i < updatedNotes.length; i++) {
				let noteCategory = updatedNotes[i];

				// Navigate through each note
				for (let i = 0; i < noteCategory.length; i++) {
					let note = noteCategory[i];
					let noteCount = noteCategory.filter(function (noteToTest) {
						return noteToTest === note;
					}).length;

					// Should only have 1 instance at any given time
					expect(noteCount).to.equal(1);
				}
			}
		});

		it('should not save duplicate notes if previously saved', async () => {
			// Try and add some notes
			options.body = {
				notes: validNotes,
			};

			// Save the notes multiple times
			let recentlyEditedTasting = null;
			for (let i = 0; i < 5; i++) {
				options.uri = signPath(editTastingPath, 'POST');
				recentlyEditedTasting = await request(options);
			}

			// Transform object into array
			let updatedNotes = Object.values(recentlyEditedTasting.data.notes);

			// Navigate through each note category
			for (let i = 0; i < updatedNotes.length; i++) {
				let noteCategory = updatedNotes[i];

				// Navigate through each note
				for (let i = 0; i < noteCategory.length; i++) {
					let note = noteCategory[i];
					let noteCount = noteCategory.filter(function (noteToTest) {
						return noteToTest === note;
					}).length;

					// Should only have 1 instance at any given time
					expect(noteCount).to.equal(1);
				}
			}
		});

		it('should clear the old notes for each present category', async () => {
			// Add initial notes
			options.body = {
				notes: {
					'@': ['category_still', 'nuance_red', 'condition_clean'],
					nose: ['note_acacia', 'note_honeysuckle', 'note_chamomile'],
					palate: ['note_elderflower', 'note_geranium', 'note_blossom'],
				},
			};

			// Save initial notes
			let recentlyEditedTasting = await request(options);
			let oldNotes = recentlyEditedTasting.data.notes;

			// Update with new notes
			options.body = {
				notes: {
					'@': ['category_sparkling', 'nuance_pink', 'condition_unclean'],
					nose: ['note_grape', 'note_quince', 'note_pear'],
					palate: ['note_lemon', 'note_lime', 'note_orange_peel'],
				},
			};

			// Save new notes
			options.uri = signPath(editTastingPath, 'POST');
			recentlyEditedTasting = await request(options);
			let newNotes = recentlyEditedTasting.data.notes;

			// Test for General Notes
			let generalIntersection = oldNotes['@'].filter((noteKey) => newNotes['@'].includes(noteKey));
			expect(generalIntersection.length).to.equal(0);
			newNotes['@'].sort((a, b) => (a > b ? 1 : -1));
			options.body.notes['@'].sort((a, b) => (a > b ? 1 : -1));
			expect(newNotes['@']).to.deep.equal(options.body.notes['@']);

			// Test for Nose Notes
			let noseIntersection = oldNotes['nose'].filter((noteKey) =>
				newNotes['nose'].includes(noteKey)
			);
			expect(noseIntersection.length).to.equal(0);
			newNotes['nose'].sort((a, b) => (a > b ? 1 : -1));
			options.body.notes['nose'].sort((a, b) => (a > b ? 1 : -1));
			expect(newNotes['nose']).to.deep.equal(options.body.notes['nose']);

			// Test for Palate Notes
			let palateIntersection = oldNotes['palate'].filter((noteKey) =>
				newNotes['palate'].includes(noteKey)
			);
			expect(palateIntersection.length).to.equal(0);
			newNotes['palate'].sort((a, b) => (a > b ? 1 : -1));
			options.body.notes['palate'].sort((a, b) => (a > b ? 1 : -1));
			expect(newNotes['palate']).to.deep.equal(options.body.notes['palate']);
		});

		it('should not clear the old notes if not included in the payload (all)', async () => {
			// Add initial notes
			options.body = {
				notes: {
					'@': ['category_still', 'nuance_red', 'condition_clean'],
					nose: ['note_acacia', 'note_honeysuckle', 'note_chamomile'],
					palate: ['note_elderflower', 'note_geranium', 'note_blossom'],
				},
			};

			// Save initial notes
			let recentlyEditedTasting = await request(options);
			let oldNotes = recentlyEditedTasting.data.notes;

			// Remove notes from the payload
			options.body = {
				name: makeUniqueString(),
			};

			// Save new notes
			options.uri = signPath(editTastingPath, 'POST');
			recentlyEditedTasting = await request(options);
			let newNotes = recentlyEditedTasting.data.notes;
			expect(oldNotes).to.deep.equal(newNotes);
		});

		it('should not clear the old notes if not included in the payload (@)', async () => {
			// Add initial notes
			options.body = {
				notes: {
					'@': ['category_still', 'nuance_red', 'condition_clean'],
					nose: ['note_acacia', 'note_honeysuckle', 'note_chamomile'],
					palate: ['note_elderflower', 'note_geranium', 'note_blossom'],
				},
			};

			// Save initial notes
			let recentlyEditedTasting = await request(options);
			let oldNotes = recentlyEditedTasting.data.notes;

			// Remove @ notes from the payload
			options.body = {
				notes: {
					nose: ['note_grape', 'note_quince', 'note_pear'],
					palate: ['note_lemon', 'note_lime', 'note_orange_peel'],
				},
			};

			// Save new notes
			options.uri = signPath(editTastingPath, 'POST');
			recentlyEditedTasting = await request(options);
			let newNotes = recentlyEditedTasting.data.notes;
			expect(oldNotes['@']).to.deep.equal(newNotes['@']);
			expect(oldNotes['nose']).to.not.deep.equal(newNotes['nose']);
			expect(oldNotes['palate']).to.not.deep.equal(newNotes['palate']);
		});

		it('should not clear the old notes if not included in the payload (nose)', async () => {
			// Add initial notes
			options.body = {
				notes: {
					'@': ['category_still', 'nuance_red', 'condition_clean'],
					nose: ['note_acacia', 'note_honeysuckle', 'note_chamomile'],
					palate: ['note_elderflower', 'note_geranium', 'note_blossom'],
				},
			};

			// Save initial notes
			let recentlyEditedTasting = await request(options);
			let oldNotes = recentlyEditedTasting.data.notes;

			// Remove nose notes from the payload
			options.body = {
				notes: {
					'@': ['category_sparkling', 'nuance_pink', 'condition_unclean'],
					palate: ['note_lemon', 'note_lime', 'note_orange_peel'],
				},
			};

			// Save new notes
			options.uri = signPath(editTastingPath, 'POST');
			recentlyEditedTasting = await request(options);
			let newNotes = recentlyEditedTasting.data.notes;
			expect(oldNotes['nose']).to.deep.equal(newNotes['nose']);
			expect(oldNotes['@']).to.not.deep.equal(newNotes['@']);
			expect(oldNotes['palate']).to.not.deep.equal(newNotes['palate']);
		});

		it('should not clear the old notes if not included in the payload (palate)', async () => {
			// Add initial notes
			options.body = {
				notes: {
					'@': ['category_still', 'nuance_red', 'condition_clean'],
					nose: ['note_acacia', 'note_honeysuckle', 'note_chamomile'],
					palate: ['note_elderflower', 'note_geranium', 'note_blossom'],
				},
			};

			// Save initial notes
			let recentlyEditedTasting = await request(options);
			let oldNotes = recentlyEditedTasting.data.notes;

			// Remove palate notes from the payload
			options.body = {
				notes: {
					'@': ['category_sparkling', 'nuance_pink', 'condition_unclean'],
					nose: ['note_grape', 'note_quince', 'note_pear'],
				},
			};

			// Save new notes
			options.uri = signPath(editTastingPath, 'POST');
			recentlyEditedTasting = await request(options);
			let newNotes = recentlyEditedTasting.data.notes;
			expect(oldNotes['palate']).to.deep.equal(newNotes['palate']);
			expect(oldNotes['@']).to.not.deep.equal(newNotes['@']);
			expect(oldNotes['nose']).to.not.deep.equal(newNotes['nose']);
		});

		/* Make sure that ratings are not affected */

		it('should be successful when updating tasting rating alone', async () => {
			// try and add some rating
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.rating).to.be.an('object');
			checkProperRatingData(rawTasting, options.body.rating);
		});

		it('should limit the rating balance decimal places to 9 if more than 9', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 0.9999999999, //ten decimal places
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.rating.balance).to.equal(
				parseFloat(options.body.rating.balance).toFixed(9)
			);
		});

		it('should be successful if balance has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 0.999999999, //exactly 9 decimal places
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);
		});

		it('should limit the rating length decimal places to 9 if more than 9', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 0.9999999999, //ten decimal places
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.rating.length).to.equal(parseFloat(options.body.rating.length).toFixed(9));
		});

		it('should be successful if length has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 0.999999999, //exactly 9 decimal places
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);
		});

		it('should limit the rating intensity decimal places to 9 if more than 9', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 0.9999999999, //ten decimal places
					terroir: 1,
					complexity: 1,
				},
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.rating.intensity).to.equal(
				parseFloat(options.body.rating.intensity).toFixed(9)
			);
		});

		it('should be successful if intensity has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 0.999999999, //9 decimal places
					terroir: 1,
					complexity: 1,
				},
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);
		});

		it('should limit the rating terroir decimal places to 9 if more than 9', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 0.9999999999, //ten decimal places
					complexity: 1,
				},
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.rating.terroir).to.equal(
				parseFloat(options.body.rating.terroir).toFixed(9)
			);
		});

		it('should be successful if terroir has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 0.999999999, //9 decimal places
					complexity: 1,
				},
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);
		});

		it('should limit the rating complexity decimal places to 9 if more than 9', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 0.9999999999, //ten decimal places
				},
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.rating.complexity).to.equal(
				parseFloat(options.body.rating.complexity).toFixed(9)
			);
		});

		it('should be successful if complexity has a max value of 0.999999999 or [ones place value].[9 decimal places]', async () => {
			options.body = {
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 0.999999999, //9 decimal places
				},
			};
			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);
		});

		it('should be successful even if quality and drinkability are present', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 'a'.repeat(16 - 1),
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
					quality: 1,
					drinkability: 1,
				},
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.rating).to.be.an('object');
			checkProperRatingData(rawTasting, options.body.rating);
		});

		it('should be successful if rating version is equal to max(16)-1 chars', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 'a'.repeat(16 - 1),
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.rating).to.be.an('object');
			checkProperRatingData(rawTasting, options.body.rating);
		});

		it('should be successful if rating version is equal to max(16) chars', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 'a'.repeat(16),
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};

			let recentlyEditedTasting = await request(options);
			testTastingData(recentlyEditedTasting);

			// Verify that the field was updated
			let rawTasting = await getRawData(options, recentlyEditedTasting.data.ref);
			expect(rawTasting.rating).to.be.an('object');
			checkProperRatingData(rawTasting, options.body.rating);
		});

		/* Negative tests */

		it('should return an error if impression ref is non-existing', async () => {
			let editTastingPath = '/tasting/' + makeUniqueString();
			options.uri = signPath(editTastingPath, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if payload is empty', async () => {
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject name is empty', async () => {
			options.body = {
				name: '',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject name is null', async () => {
			options.body = {
				name: null,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject name exceed max(128) chars', async () => {
			options.body = {
				name: 'a'.repeat(128 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject name has html <>', async () => {
			options.body = {
				name: '<p>test_name<p>',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject name has non printable chars', async () => {
			options.body = {
				name: 'test\r_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin do not have slash(/)', async () => {
			options.body = {
				source: 'quickweb2.0.1-rc+3456',
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin flow exceed max(16) chars', async () => {
			options.body = {
				source: makeUniqueString(17) + '/' + 'web' + '/2.0.1-rc+3456',
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin flow has html <>', async () => {
			options.body = {
				source: '<p>quick</p>' + '/web/' + '2.0.1-rc+3456',
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin flow has non printable chars', async () => {
			options.body = {
				source: 'qui \r \n \t ck' + '/test/' + '2.0.1-rc+3456',
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin client exceed max(32) chars', async () => {
			options.body = {
				source: 'quick' + '/' + makeUniqueString(33) + '/2.0.1-rc+3456',
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin client has html <>', async () => {
			options.body = {
				source: 'quick' + '/<p>test<p>/' + '2.0.1-rc+3456',
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin client has non printable chars', async () => {
			options.body = {
				source: 'quick' + '/te \r \n \t st/' + '2.0.1-rc+3456',
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin version exceed 16 chars', async () => {
			options.body = {
				source: 'quick' + '/' + 'web' + '/' + makeUniqueString(17),
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin version has html <>', async () => {
			options.body = {
				source: 'quick' + '/' + 'web' + '/' + '<p>1.0.0</p>',
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if origin version has non printable chars', async () => {
			options.body = {
				source: 'quick' + '/' + 'web' + '/' + '1\r\n\t.0.0',
				name: 'test_name',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject producer exceed max(128) chars', async () => {
			options.body = {
				name: 'test_name',
				producer: 'a'.repeat(128 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject producer has html <>', async () => {
			options.body = {
				name: 'test_name',
				producer: '<p>withhtml<p>',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject producer has non printable chars', async () => {
			options.body = {
				name: 'test_name',
				producer: 'with\rnon\nprintable\tchars',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject country exceed exceed max(64) chars', async () => {
			options.body = {
				name: 'test_name',
				country: 'a'.repeat(64 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject country has html <>', async () => {
			options.body = {
				name: 'test_name',
				country: '<p>withhtml<p>',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject country has non printable chars', async () => {
			options.body = {
				name: 'test_name',
				country: 'with\rnon\nprintable\tchars',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject region exceed max(255) chars', async () => {
			options.body = {
				name: 'test_name',
				region: 'a'.repeat(255 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject region has html <>', async () => {
			options.body = {
				name: 'test_name',
				region: '<p>withhtml<p>',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject region has non printable chars', async () => {
			options.body = {
				name: 'test_name',
				region: 'with\rnon\nprintable\tchars',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject vintage exceed max(64) chars', async () => {
			options.body = {
				name: 'test_name',
				vintage: 'a'.repeat(64 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject vintage has html <>', async () => {
			options.body = {
				name: 'test_name',
				vintage: '<p>withhtml<p>',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject vintage has non printable chars', async () => {
			options.body = {
				name: 'test_name',
				vintage: 'with\rnon\nprintable\tchars',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject grape exceed max(128) chars', async () => {
			options.body = {
				name: 'test_name',
				grape: 'a'.repeat(128 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject grape has html <>', async () => {
			options.body = {
				name: 'test_name',
				grape: '<p>withhtml<p>',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject grape has non printable chars', async () => {
			options.body = {
				name: 'test_name',
				grape: 'with\rnon\nprintable\tchars',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject price is not a numberic[string]', async () => {
			// Edit and update tasting price
			options.body = {
				price: 'a' + makeUniqueString(),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject price is not a numberic[array]', async () => {
			// Edit and update tasting price
			options.body = {
				price: ['100'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject price is not a numberic[object]', async () => {
			// Edit and update tasting price
			options.body = {
				price: {field: '100'},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject price exceeds the maximum decimal places of 4', async () => {
			// Edit and update tasting price
			options.body = {
				price: 100.11111,
			};
			await checkStatusCodeByOptions(options, 400);
		});
		0;

		it('should return an error if subject currency is not a numberic[array]', async () => {
			options.body = {
				currency: ['USD'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject currency is not a numberic[object]', async () => {
			options.body = {
				currency: {field: 'USD'},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject currency exceed max(16) chars', async () => {
			options.body = {
				currency: 'a'.repeat(16 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject clean_key is not a numberic[array]', async () => {
			options.body = {
				clean_key: ['clean'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject clean_key is not a numberic[object]', async () => {
			options.body = {
				clean_key: {field: 'clean'},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject clean_key exceed max(64) chars', async () => {
			options.body = {
				clean_key: 'a'.repeat(64 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject producer_key is not a numberic[array]', async () => {
			options.body = {
				producer_key: ['producer'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject producer_key is not a numberic[object]', async () => {
			options.body = {
				producer_key: {field: 'producer'},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject producer_key exceed max(64) chars', async () => {
			options.body = {
				producer_key: 'a'.repeat(64 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject country_key is not a numberic[array]', async () => {
			options.body = {
				country_key: ['country'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject country_key is not a numberic[object]', async () => {
			options.body = {
				country_key: {field: 'country'},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject country_key exceed max(64) chars', async () => {
			options.body = {
				country_key: 'a'.repeat(64 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject region_key is not a numberic[array]', async () => {
			options.body = {
				region_key: ['region'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject region_key is not a numberic[object]', async () => {
			options.body = {
				region_key: {field: 'region'},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if subject region_key exceed max(64) chars', async () => {
			options.body = {
				region_key: 'a'.repeat(64 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if stats event exceed max(32) chars', async () => {
			options.body = {name: 'test_name', stats: [{}]};
			options.body.stats[0]['a'.repeat(32 + 1)] = 500;
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if stats value is numeric not numeric', async () => {
			options.body = {
				name: 'test_name',
				stats: [{eventname: 'not numeric'}],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if stats value is not numeric', async () => {
			options.body = {
				name: 'test_name',
				stats: [{eventname: 'not numeric'}],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if stats version has html <>', async () => {
			options.body = {
				name: 'test_name',
				stats: [{'<div>html</div>': 500}],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if stats version has non printable chars', async () => {
			options.body = {
				name: 'test_name',
				stats: [{'te\r \n \tst': 500}],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if individual summary_wine exceeds max(4000) chars', async () => {
			options.body = {
				summary_wine: 'a'.repeat(4000 + 1),
				name: 'Test Tasting',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if individual summary_personal exceeds max(4000) chars', async () => {
			options.body = {
				summary_personal: 'a'.repeat(4000 + 1),
				name: 'Test Tasting',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if individual food_pairing exceeds max(4000) chars', async () => {
			options.body = {
				food_pairing: 'a'.repeat(4000 + 1),
				name: 'Test Tasting',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if metadata value is an int', async () => {
			options.body = {
				metadata: 123,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if metadata value is a invalid [string] stringified object', async () => {
			options.body = {
				metadata: "{'test'}",
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if metadata value is a invalid [int] stringified object', async () => {
			options.body = {
				metadata: '{324234}',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if metadata value is a invalid [array] stringified object', async () => {
			options.body = {
				metadata: '{[]}',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if info field is not a valid impression info type key', async () => {
			options.body = {
				info: {},
			};

			options.body.info[makeUniqueString()] = 'tall';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [mold] ref is invalid', async () => {
			options.body = baseData;
			options.body.mold = '!#' + makeUniqueString();
			options.uri = signPath(editTastingPath, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [mold] ref does not exist', async () => {
			options.body = baseData;
			options.body.mold = makeUniqueString();
			options.uri = signPath(editTastingPath, 'POST');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if notes is not an object [string]', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: 'shouldbeobject',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if notes is not an object [int]', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: 123,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if notes is not an object [float]', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: 100.4324,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if notes is not an object [array]', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: ['key1', 'key2', 'key3'],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if notes is sent as an array event if keys are valid', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: [
					'category_still',
					'nuance_rose',
					'nuance_orange',
					'clarity_hazy',
					'colorintensity_deep',
				],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if note is 1', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: {
					palate: [1],
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a note is not a string', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: {
					palate: ['testkey1', 456],
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a note has html <>', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: {
					palate: ['<p>paragraph</p>', '<img />'],
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a note has non printable chars', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: {
					palate: ['testkey1', 'testkey\t2', 'testkey\r3'],
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a note type is invalid', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: {
					invalid_note_type: ['testval1', 'testval2', 'testval3'],
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if the notes property/object has more than 12 keys', async () => {
			options.body = {
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
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a note type is valid but the value is not an array', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: {
					palate: 'not_an_array',
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a note type is valid but one of the values is a non-existing note key', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: {
					palate: ['category_still', 'nuance_orange', 'not_an_existing_key'],
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a note type is valid but one of the values is a deprecated note key', async () => {
			// deprecate one of the notes first
			let keyToDeprecate = {notes: ['nuance_orange']};
			await deprecateNotes(keyToDeprecate);

			// include a deprecated not in the create tasting payload
			options.body = {
				name: 'Test Tasting',
				notes: {
					palate: ['category_still', 'nuance_orange'],
				},
			};
			await checkStatusCodeByOptions(options, 400);

			// clean up: make sure to re-activate the deprecated note again
			await activateNotes(keyToDeprecate);
		});

		it('should return an error if a note type is valid but one of the values is invalid', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: {
					palate: ['category_still', 'nuance_orange', '#$!#^$*()-=@'],
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a note key has reached the max chars limit of 255', async () => {
			options.body = {
				name: 'Test Tasting',
				notes: {
					palate: ['category_still', 'nuance_orange', 'a'.repeat(256)],
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating version exceed max(16) chars', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 'a'.repeat(16 + 1),
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating version is missing', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating version has html <>', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: '<p>version!</p>',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating version has non printable chars', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: '1.\r0.\n0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating final_points is missing', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 1,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating balance is missing', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating length is missing', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					balance: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating intensity is missing', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					balance: 1,
					length: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating terroir is missing', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating complexity is missing', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 1,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating final_points not a number', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 'a',
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating balance not a number', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 'a',
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating length not a number', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 1,
					length: 'a',
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating intensity not a number', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 'a',
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating terroir not a number', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 'a',
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating complexity not a number', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 'a',
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating final_points is less than min(0) value', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: -1,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating final_points is greater than 100', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100 + 1,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating balance is less than min(0) value', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: -1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating balance has place value of tens', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 10,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating length is less than min(0) value', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: -1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating length has place value of tens', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 10,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating intensity is less than min(0) value', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: -1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating intensity has place value of tens', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 10,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating terroir is less than min(0) value', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: -1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating terroir has place value of tens', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 10,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating complexity is less than min(0) value', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: -1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if rating complexity has place value of tens', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: 4,
					final_points: 100,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 10,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if final_points have string values', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: '1.0.0.0',
					final_points: '00088',
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if balance have string values', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: '000.4',
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if length have string values', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: '0001',
					intensity: 1,
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if intensity have string values', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: '01',
					terroir: 1,
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if terroir have string values', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: '0.4',
					complexity: 1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if complexity have string values', async () => {
			options.body = {
				name: 'test_name',
				rating: {
					version: '1.0.0.0',
					final_points: 88,
					balance: 1,
					length: 1,
					intensity: 1,
					terroir: 1,
					complexity: '00.9999',
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if [location] exceeds the max of [64] chars', async () => {
			options.body = {
				location: makeUniqueString(64 + 1),
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to able to save [gps] with [lat] alone', async () => {
			options.body = {
				gps: {
					lat: 90,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to able to save [gps] with [long] alone', async () => {
			options.body = {
				gps: {
					long: 180,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign a [lat] value more than [90]', async () => {
			options.body = {
				gps: {
					lat: 90.1,
					long: 180,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign a [lat] value less than [-90]', async () => {
			options.body = {
				gps: {
					lat: -90.1,
					long: 180,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign a [long] value more than [180]', async () => {
			options.body = {
				gps: {
					lat: 90,
					long: 180.1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to assign a [long] value less than [-180]', async () => {
			options.body = {
				gps: {
					lat: 90,
					long: -180.1,
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to update [fkey] once created', async () => {
			options.body = {
				fkey: {
					origin: 'BB',
					subject_key: 'BB',
					event_key: 'BB',
					client_key: 'BB',
				},
			};
			await checkStatusCodeByOptions(options, 400);
		});

		// Test ownership of updating tasting

		it('should be successful if the one updating the tasting is the owner', async () => {
			// Init testTasting
			let signedTastingPath = signPath('/tasting', 'POST');
			let tastingData = {name: 'initial name'};
			testTasting = await createItem(signedTastingPath, tastingData); // save testTasting for the next test

			// Edit testTasting
			options.uri = signPath('/tasting/' + testTasting.data.ref, 'POST');
			options.body = {name: 'new name'};
			let updateResult = await request(options);

			// Check for success
			checkForSuccess(updateResult);
		});

		it('should have equal value for owner ref and user ref', async () => {
			// Init testTasting
			let signedTastingPath = signPath('/tasting', 'POST');
			let tastingData = {name: 'initial name'};
			let testTasting = await createItem(signedTastingPath, tastingData); // save testTasting for the next test

			// Verify that the tasting owner key is equal to the user ref
			let signedRawTastingPath = signPath('/raw/impression/' + testTasting.data.ref, 'GET');
			let rawTasting = await getItem(signedRawTastingPath);

			expect(rawTasting.impression.owner_ref).to.equal(user1Ref);
		});

		it('should return error if the one updating the tasting is not the owner', async () => {
			// Create user2
			let path = baseUrl + '/user';
			let data = generateUserData();
			let response = await createItem(path, data);
			user2Ref = response.data.ref; // save userRef for the next test

			// Simulate login for user2
			await login(user.email, user.rawPass);

			/*
				- Edit testTasting	created by user1 but sign path with user2; 
				- Where testTasting was persisted in the previous test
				- Should return an error 400
			*/
			options.uri = signPath('/tasting/' + testTasting.data.ref, 'POST');
			options.body = {name: 'new name'};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should not be able to access tasting that belongs to other user', async () => {
			/*
				At this point, user2 is the currently logged in user.
				Accessing a tasting created by user1 should result in an error
			*/
			options.method = 'GET';
			options.uri = signPath('/raw/impression/' + testTasting.data.ref, 'GET');
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
