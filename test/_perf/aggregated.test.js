const expect = require('chai').expect;
const request = require('request-promise');
const {
	baseUrl,
	baseGetOptions,
	basePostOptions,
	createItem,
	checkForSuccess,
	checkStatusCodeByOptions,
	makeUniqueString,
	generateUserData,
	login,
	signPath,
	createTraditionalImpression,
} = require('../common.js');

describe('Impression', function () {
	this.timeout(600000);
	describe('get aggregated list', () => {
		let options, user, userData, timeBeforeQuery, timeAfterQuery, timeDifference;

		before(async () => {
			options = {...basePostOptions};
			let createUserPath = baseUrl + '/user';

			user = generateUserData();
			userData = await createItem(createUserPath, user);

			await login(user.email, user.rawPass);

			// Impression Seeds
			seed = {
				fkey: {
					origin: 'TST',
					subject: 'BBC',
					event: 'BBD',
					client: 'BBE',
					producer: 'BBF',
				},
				impressions: {
					total: 1000,
					ms: 75,
				},
				rating_stats: {
					parker_val: {
						avg: 50,
						min: 10,
						max: 100,
					},
					balance: {
						avg: 0.5,
						min: 0.45,
						max: 0.9,
					},
					length: {
						avg: 0.5,
						min: 0.4,
						max: 0.8,
					},
					intensity: {
						avg: 0.5,
						min: 0.35,
						max: 0.7,
					},
					terroir: {
						avg: 0.5,
						min: 0.3,
						max: 0.6,
					},
					complexity: {
						avg: 0.5,
						min: 0.25,
						max: 0.5,
					},
				},
				// Notes used here must be unique for each category , using the same note on two different note types will count as one, as specified in the card-2992
				// "We are ignoring if they are nose, palate or both."
				notes: {
					general: ['category_still', 'clarity_clear', 'colorintensity_deep'],
					nose: ['note_acacia', 'note_chamomile', 'note_violet'],
					palate: ['note_tomato_leaf', 'note_asparagus', 'note_pineapple'],
				},
			};

			// Generate Seed Impressions
			console.log(
				'\t\x1b[41m%s\x1b[0m',
				`Creating ${seed.impressions.total} impressions for load test`
			);
			for (let i = 1; i <= seed.impressions.total; i++) {
				await createTraditionalImpression({
					name: makeUniqueString(),
					notes: {
						'@': seed.notes.general,
						nose: seed.notes.nose,
						palate: seed.notes.palate,
					},
					rating: {
						version: 10000,
						final_points: seed.rating_stats.parker_val.avg,
						balance: seed.rating_stats.balance.avg,
						length: seed.rating_stats.length.avg,
						intensity: seed.rating_stats.intensity.avg,
						terroir: seed.rating_stats.terroir.avg,
						complexity: seed.rating_stats.complexity.avg,
					},
					fkey: {
						origin: seed.fkey.origin,
						subject_key: seed.fkey.subject,
						event_key: seed.fkey.event,
						client_key: seed.fkey.client,
						producer_key: seed.fkey.producer,
					},
				});
			}
		});

		// Important : Tests outside (and inside) this test can interfere with the expected results, with regards to execution order, and data used
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = baseUrl + `/impression/aggregated/${seed.fkey.origin}`;
		});

		// Positive Tests
		it('Check for response time', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: seed.fkey.event,
				clientkey: seed.fkey.client,
				producerkey: seed.fkey.producer,
			};

			timeBeforeQuery = new Date();
			let response = await request(options);
			timeAfterQuery = new Date();
			timeDifference = timeAfterQuery.getTime() - timeBeforeQuery.getTime();

			console.log('\t\x1b[44m%s\x1b[0m', 'Time(ms) Before: ' + timeBeforeQuery.getTime());
			console.log('\t\x1b[42m%s\x1b[0m', 'Time(ms) After: ' + timeAfterQuery.getTime());
			console.log('\t\x1b[46m%s\x1b[0m', 'Time(ms) Difference: ' + timeDifference);
			console.log('\t\x1b[46m%s\x1b[0m', 'Impressions: ' + response.data.impressions.total);

			expect(timeDifference).to.lte(seed.impressions.ms);
		});
	});
});
