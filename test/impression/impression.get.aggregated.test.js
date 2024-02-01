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

describe('Impression', () => {
	describe('get aggregated list', () => {
		let options,
			checkProperAggregatedData,
			compareAggregatedData,
			user,
			userData,
			aggregatedData,
			previousExpectation,
			allNotes = [];

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
					total: 5,
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

			// Concatenate all notes
			allNotes = allNotes.concat(seed.notes.general, seed.notes.nose, seed.notes.palate);

			// Generate Seed Impressions
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

			checkProperAggregatedData = (aggregatedData) => {
				// Check for property existence
				expect(aggregatedData).to.have.property('impressions');
				expect(aggregatedData.impressions).to.have.property('total');
				expect(aggregatedData.impressions).to.have.property('first');
				expect(aggregatedData.impressions).to.have.property('last');

				expect(aggregatedData).to.have.property('rating_stats');
				expect(aggregatedData.rating_stats).to.have.property('parker_val');
				expect(aggregatedData.rating_stats.parker_val).to.have.property('avg');
				expect(aggregatedData.rating_stats.parker_val).to.have.property('min');
				expect(aggregatedData.rating_stats.parker_val).to.have.property('max');

				expect(aggregatedData.rating_stats).to.have.property('balance');
				expect(aggregatedData.rating_stats.balance).to.have.property('avg');
				expect(aggregatedData.rating_stats.balance).to.have.property('min');
				expect(aggregatedData.rating_stats.balance).to.have.property('max');

				expect(aggregatedData.rating_stats).to.have.property('length');
				expect(aggregatedData.rating_stats.length).to.have.property('avg');
				expect(aggregatedData.rating_stats.length).to.have.property('min');
				expect(aggregatedData.rating_stats.length).to.have.property('max');

				expect(aggregatedData.rating_stats).to.have.property('intensity');
				expect(aggregatedData.rating_stats.intensity).to.have.property('avg');
				expect(aggregatedData.rating_stats.intensity).to.have.property('min');
				expect(aggregatedData.rating_stats.intensity).to.have.property('max');

				expect(aggregatedData.rating_stats).to.have.property('terroir');
				expect(aggregatedData.rating_stats.terroir).to.have.property('avg');
				expect(aggregatedData.rating_stats.terroir).to.have.property('min');
				expect(aggregatedData.rating_stats.terroir).to.have.property('max');

				expect(aggregatedData.rating_stats).to.have.property('complexity');
				expect(aggregatedData.rating_stats.complexity).to.have.property('avg');
				expect(aggregatedData.rating_stats.complexity).to.have.property('min');
				expect(aggregatedData.rating_stats.complexity).to.have.property('max');

				expect(aggregatedData).to.have.property('flags');
				for (var flag in aggregatedData.flags) {
					for (var key in aggregatedData.flags[flag]) {
						var expectedNote = flag + '_' + key;
						expect(allNotes.includes(expectedNote)).to.equal(true);
					}
				}

				// Check for correct data type
				expect(aggregatedData.impressions).to.be.an('object');
				expect(aggregatedData.impressions.total).to.be.a('number');
				expect(aggregatedData.impressions.first).to.be.dateString();
				expect(aggregatedData.impressions.last).to.be.dateString();
				expect(aggregatedData.rating_stats).to.be.an('object');

				// Parker Val / Final Points
				expect(aggregatedData.rating_stats.parker_val).to.be.an('object');
				expect(aggregatedData.rating_stats.parker_val.avg).to.satisfy(function (avg) {
					return typeof avg === 'number';
				});
				expect(aggregatedData.rating_stats.parker_val.min).to.satisfy(function (min) {
					return typeof min === 'number';
				});
				expect(aggregatedData.rating_stats.parker_val.max).to.satisfy(function (max) {
					return typeof max === 'number';
				});

				// Balance
				expect(aggregatedData.rating_stats.balance).to.be.an('object');
				expect(aggregatedData.rating_stats.balance.avg).to.satisfy(function (avg) {
					return typeof avg === 'number';
				});
				expect(aggregatedData.rating_stats.balance.min).to.satisfy(function (min) {
					return typeof min === 'number';
				});
				expect(aggregatedData.rating_stats.balance.max).to.satisfy(function (max) {
					return typeof max === 'number';
				});

				// Length
				expect(aggregatedData.rating_stats.length).to.be.an('object');
				expect(aggregatedData.rating_stats.length.avg).to.satisfy(function (avg) {
					return typeof avg === 'number';
				});
				expect(aggregatedData.rating_stats.length.min).to.satisfy(function (min) {
					return typeof min === 'number';
				});
				expect(aggregatedData.rating_stats.length.max).to.satisfy(function (max) {
					return typeof max === 'number';
				});

				// Intensity
				expect(aggregatedData.rating_stats.intensity).to.be.an('object');
				expect(aggregatedData.rating_stats.intensity.avg).to.satisfy(function (avg) {
					return typeof avg === 'number';
				});
				expect(aggregatedData.rating_stats.intensity.min).to.satisfy(function (min) {
					return typeof min === 'number';
				});
				expect(aggregatedData.rating_stats.intensity.max).to.satisfy(function (max) {
					return typeof max === 'number';
				});

				// Terroir
				expect(aggregatedData.rating_stats.terroir).to.be.an('object');
				expect(aggregatedData.rating_stats.terroir.avg).to.satisfy(function (avg) {
					return typeof avg === 'number';
				});
				expect(aggregatedData.rating_stats.terroir.min).to.satisfy(function (min) {
					return typeof min === 'number';
				});
				expect(aggregatedData.rating_stats.terroir.max).to.satisfy(function (max) {
					return typeof max === 'number';
				});

				// Complexity
				expect(aggregatedData.rating_stats.complexity).to.be.an('object');
				expect(aggregatedData.rating_stats.complexity.avg).to.satisfy(function (avg) {
					return typeof avg === 'number';
				});
				expect(aggregatedData.rating_stats.complexity.min).to.satisfy(function (min) {
					return typeof min === 'number';
				});
				expect(aggregatedData.rating_stats.complexity.max).to.satisfy(function (max) {
					return typeof max === 'number';
				});

				// Flags
				expect(aggregatedData.flags).to.be.an('object');
				for (var flag in aggregatedData.flags) {
					for (var key in aggregatedData.flags[flag]) {
						expect(aggregatedData.flags[flag][key]).to.be.a('number');
					}
				}
			};

			compareAggregatedData = (aggregatedDataA, aggregatedDataB) => {
				// Impressions
				expect(aggregatedDataA.impressions.total).to.equal(aggregatedDataB.impressions.total);
				expect(new Date(aggregatedDataA.impressions.last)).to.be.gte(
					new Date(aggregatedDataA.impressions.first)
				);

				// Rating.ParkerVal
				expect(aggregatedDataA.rating_stats.parker_val.avg.toFixed(2)).to.equal(
					aggregatedDataB.rating_stats.parker_val.avg.toFixed(2)
				);
				expect(aggregatedDataA.rating_stats.parker_val.min).to.equal(
					aggregatedDataB.rating_stats.parker_val.min
				);
				expect(aggregatedDataA.rating_stats.parker_val.max).to.equal(
					aggregatedDataB.rating_stats.parker_val.max
				);

				// Rating.Balance
				expect(aggregatedDataA.rating_stats.balance.avg.toFixed(2)).to.equal(
					aggregatedDataB.rating_stats.balance.avg.toFixed(2)
				);
				expect(aggregatedDataA.rating_stats.balance.min).to.equal(
					aggregatedDataB.rating_stats.balance.min
				);
				expect(aggregatedDataA.rating_stats.balance.max).to.equal(
					aggregatedDataB.rating_stats.balance.max
				);

				// Rating.Length
				expect(aggregatedDataA.rating_stats.length.avg.toFixed(2)).to.equal(
					aggregatedDataB.rating_stats.length.avg.toFixed(2)
				);
				expect(aggregatedDataA.rating_stats.length.min).to.equal(
					aggregatedDataB.rating_stats.length.min
				);
				expect(aggregatedDataA.rating_stats.length.max).to.equal(
					aggregatedDataB.rating_stats.length.max
				);

				// Rating.Intensity
				expect(aggregatedDataA.rating_stats.intensity.avg.toFixed(2)).to.equal(
					aggregatedDataB.rating_stats.intensity.avg.toFixed(2)
				);
				expect(aggregatedDataA.rating_stats.intensity.min).to.equal(
					aggregatedDataB.rating_stats.intensity.min
				);
				expect(aggregatedDataA.rating_stats.intensity.max).to.equal(
					aggregatedDataB.rating_stats.intensity.max
				);

				// Rating.Terroir
				expect(aggregatedDataA.rating_stats.terroir.avg.toFixed(2)).to.equal(
					aggregatedDataB.rating_stats.terroir.avg.toFixed(2)
				);
				expect(aggregatedDataA.rating_stats.terroir.min).to.equal(
					aggregatedDataB.rating_stats.terroir.min
				);
				expect(aggregatedDataA.rating_stats.terroir.max).to.equal(
					aggregatedDataB.rating_stats.terroir.max
				);

				// Rating.Complexity
				expect(aggregatedDataA.rating_stats.complexity.avg.toFixed(2)).to.equal(
					aggregatedDataB.rating_stats.complexity.avg.toFixed(2)
				);
				expect(aggregatedDataA.rating_stats.complexity.min).to.equal(
					aggregatedDataB.rating_stats.complexity.min
				);
				expect(aggregatedDataA.rating_stats.complexity.max).to.equal(
					aggregatedDataB.rating_stats.complexity.max
				);

				// Test for Note Counts
				for (var flag in aggregatedDataA.flags) {
					for (var key in aggregatedDataA.flags[flag]) {
						expect(aggregatedDataA.flags[flag][key]).to.equal(aggregatedDataB.impressions.total);
					}
				}
			};
		});

		// Important : Tests outside (and inside) this test can interfere with the expected results, with regards to execution order, and data used
		beforeEach(async () => {
			options.transform = null;
			options.method = 'GET';
			options.uri = baseUrl + `/impression/aggregated/${seed.fkey.origin}`;
		});

		// Positive Tests
		describe('should be successful and return proper data [full parameters]', () => {
			it('Check data properties', async () => {
				options.qs = {
					subjectkey: seed.fkey.subject,
					eventkey: seed.fkey.event,
					clientkey: seed.fkey.client,
				};

				let response = await request(options);
				aggregatedData = response.data;

				checkForSuccess(response);
			});

			it('Check data contents (seed)', async () => {
				// Set our expectations
				let expectations = {
					impressions: {
						total: seed.impressions.total,
						first: aggregatedData.impressions.first,
						last: aggregatedData.impressions.last,
					},
					rating_stats: {
						parker_val: {
							avg: seed.rating_stats.parker_val.avg,
							min: seed.rating_stats.parker_val.avg,
							max: seed.rating_stats.parker_val.avg,
						},
						balance: {
							avg: seed.rating_stats.balance.avg,
							min: seed.rating_stats.balance.avg,
							max: seed.rating_stats.balance.avg,
						},
						length: {
							avg: seed.rating_stats.length.avg,
							min: seed.rating_stats.length.avg,
							max: seed.rating_stats.length.avg,
						},
						intensity: {
							avg: seed.rating_stats.intensity.avg,
							min: seed.rating_stats.intensity.avg,
							max: seed.rating_stats.intensity.avg,
						},
						terroir: {
							avg: seed.rating_stats.terroir.avg,
							min: seed.rating_stats.terroir.avg,
							max: seed.rating_stats.terroir.avg,
						},
						complexity: {
							avg: seed.rating_stats.complexity.avg,
							min: seed.rating_stats.complexity.avg,
							max: seed.rating_stats.complexity.avg,
						},
					},
				};

				compareAggregatedData(aggregatedData, expectations);
			});

			it('Check data contents (after inserts)', async () => {
				let addedImpressions = 0;

				// Insert one impression with lower values to shift entire data
				await createTraditionalImpression({
					name: makeUniqueString(),
					notes: {
						'@': seed.notes.general,
						nose: seed.notes.nose,
						palate: seed.notes.palate,
					},
					rating: {
						version: 10000,
						final_points: seed.rating_stats.parker_val.min,
						balance: seed.rating_stats.balance.min,
						length: seed.rating_stats.length.min,
						intensity: seed.rating_stats.intensity.min,
						terroir: seed.rating_stats.terroir.min,
						complexity: seed.rating_stats.complexity.min,
					},
					fkey: {
						origin: seed.fkey.origin,
						subject_key: seed.fkey.subject,
						event_key: seed.fkey.event,
						client_key: seed.fkey.client,
					},
				});
				addedImpressions++;

				// Insert one impression with higher values to shift entire data
				await createTraditionalImpression({
					name: makeUniqueString(),
					notes: {
						'@': seed.notes.general,
						nose: seed.notes.nose,
						palate: seed.notes.palate,
					},
					rating: {
						version: 10000,
						final_points: seed.rating_stats.parker_val.max,
						balance: seed.rating_stats.balance.max,
						length: seed.rating_stats.length.max,
						intensity: seed.rating_stats.intensity.max,
						terroir: seed.rating_stats.terroir.max,
						complexity: seed.rating_stats.complexity.max,
					},
					fkey: {
						origin: seed.fkey.origin,
						subject_key: seed.fkey.subject,
						event_key: seed.fkey.event,
						client_key: seed.fkey.client,
					},
				});
				addedImpressions++;

				options.qs = {
					subjectkey: seed.fkey.subject,
					eventkey: seed.fkey.event,
					clientkey: seed.fkey.client,
				};

				// Requery
				let updatedResponse = await request(options);
				aggregatedData = updatedResponse.data;

				// Set our expectations
				let expectations = {
					impressions: {
						total: seed.impressions.total + addedImpressions,
						first: aggregatedData.impressions.first,
						last: aggregatedData.impressions.last,
					},
					rating_stats: {
						parker_val: {
							avg:
								(seed.rating_stats.parker_val.avg * seed.impressions.total +
									seed.rating_stats.parker_val.min +
									seed.rating_stats.parker_val.max) /
								(seed.impressions.total + addedImpressions),
							min: seed.rating_stats.parker_val.min,
							max: seed.rating_stats.parker_val.max,
						},
						balance: {
							avg:
								(seed.rating_stats.balance.avg * seed.impressions.total +
									seed.rating_stats.balance.min +
									seed.rating_stats.balance.max) /
								(seed.impressions.total + addedImpressions),
							min: seed.rating_stats.balance.min,
							max: seed.rating_stats.balance.max,
						},
						length: {
							avg:
								(seed.rating_stats.length.avg * seed.impressions.total +
									seed.rating_stats.length.min +
									seed.rating_stats.length.max) /
								(seed.impressions.total + addedImpressions),
							min: seed.rating_stats.length.min,
							max: seed.rating_stats.length.max,
						},
						intensity: {
							avg:
								(seed.rating_stats.intensity.avg * seed.impressions.total +
									seed.rating_stats.intensity.min +
									seed.rating_stats.intensity.max) /
								(seed.impressions.total + addedImpressions),
							min: seed.rating_stats.intensity.min,
							max: seed.rating_stats.intensity.max,
						},
						terroir: {
							avg:
								(seed.rating_stats.terroir.avg * seed.impressions.total +
									seed.rating_stats.terroir.min +
									seed.rating_stats.terroir.max) /
								(seed.impressions.total + addedImpressions),
							min: seed.rating_stats.terroir.min,
							max: seed.rating_stats.terroir.max,
						},
						complexity: {
							avg:
								(seed.rating_stats.complexity.avg * seed.impressions.total +
									seed.rating_stats.complexity.min +
									seed.rating_stats.complexity.max) /
								(seed.impressions.total + addedImpressions),
							min: seed.rating_stats.complexity.min,
							max: seed.rating_stats.complexity.max,
						},
					},
				};
				previousExpectation = expectations;

				compareAggregatedData(aggregatedData, expectations);
			});
		});

		describe('should be successful and return proper data [subjectkey]', () => {
			it('Check data properties', async () => {
				options.qs = {
					subjectkey: seed.fkey.subject,
				};

				let response = await request(options);
				aggregatedData = response.data;
				checkForSuccess(response);
				checkProperAggregatedData(aggregatedData);
			});

			it('Check data contents (subject specific)', async () => {
				let subjectSpecificKey = 'ntblsubject';
				let subjectSpecificImpressions = 4;

				for (let i = 1; i <= subjectSpecificImpressions; i++) {
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
							subject_key: subjectSpecificKey,
							event_key: seed.fkey.event,
							client_key: seed.fkey.client,
						},
					});
				}

				options.qs = {
					subjectkey: subjectSpecificKey,
				};

				let response = await request(options);
				aggregatedData = response.data;

				// Set our expectations
				let expectations = {
					impressions: {
						total: subjectSpecificImpressions,
						first: aggregatedData.impressions.first,
						last: aggregatedData.impressions.last,
					},
					rating_stats: {
						parker_val: {
							avg: seed.rating_stats.parker_val.avg,
							min: seed.rating_stats.parker_val.avg,
							max: seed.rating_stats.parker_val.avg,
						},
						balance: {
							avg: seed.rating_stats.balance.avg,
							min: seed.rating_stats.balance.avg,
							max: seed.rating_stats.balance.avg,
						},
						length: {
							avg: seed.rating_stats.length.avg,
							min: seed.rating_stats.length.avg,
							max: seed.rating_stats.length.avg,
						},
						intensity: {
							avg: seed.rating_stats.intensity.avg,
							min: seed.rating_stats.intensity.avg,
							max: seed.rating_stats.intensity.avg,
						},
						terroir: {
							avg: seed.rating_stats.terroir.avg,
							min: seed.rating_stats.terroir.avg,
							max: seed.rating_stats.terroir.avg,
						},
						complexity: {
							avg: seed.rating_stats.complexity.avg,
							min: seed.rating_stats.complexity.avg,
							max: seed.rating_stats.complexity.avg,
						},
					},
				};

				checkForSuccess(response);
				checkProperAggregatedData(aggregatedData);
				compareAggregatedData(aggregatedData, expectations);
				expect(aggregatedData.impressions.total).to.not.equal(
					previousExpectation.impressions.total
				);
			});
		});

		describe('should be successful and return proper data [eventkey]', () => {
			it('Check data properties', async () => {
				options.qs = {
					subjectkey: seed.fkey.subject,
					eventkey: seed.fkey.event,
				};

				let response = await request(options);
				aggregatedData = response.data;
				checkForSuccess(response);
				checkProperAggregatedData(aggregatedData);
			});

			it('Check data contents (event specific)', async () => {
				let eventSpecificKey = 'ntblevent';
				let eventSpecificImpressions = 3;

				for (let i = 1; i <= eventSpecificImpressions; i++) {
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
							event_key: eventSpecificKey,
							client_key: seed.fkey.client,
						},
					});
				}

				options.qs = {
					subjectkey: seed.fkey.subject,
					eventkey: eventSpecificKey,
				};

				let response = await request(options);
				aggregatedData = response.data;

				// Set our expectations
				let expectations = {
					impressions: {
						total: eventSpecificImpressions,
						first: aggregatedData.impressions.first,
						last: aggregatedData.impressions.last,
					},
					rating_stats: {
						parker_val: {
							avg: seed.rating_stats.parker_val.avg,
							min: seed.rating_stats.parker_val.avg,
							max: seed.rating_stats.parker_val.avg,
						},
						balance: {
							avg: seed.rating_stats.balance.avg,
							min: seed.rating_stats.balance.avg,
							max: seed.rating_stats.balance.avg,
						},
						length: {
							avg: seed.rating_stats.length.avg,
							min: seed.rating_stats.length.avg,
							max: seed.rating_stats.length.avg,
						},
						intensity: {
							avg: seed.rating_stats.intensity.avg,
							min: seed.rating_stats.intensity.avg,
							max: seed.rating_stats.intensity.avg,
						},
						terroir: {
							avg: seed.rating_stats.terroir.avg,
							min: seed.rating_stats.terroir.avg,
							max: seed.rating_stats.terroir.avg,
						},
						complexity: {
							avg: seed.rating_stats.complexity.avg,
							min: seed.rating_stats.complexity.avg,
							max: seed.rating_stats.complexity.avg,
						},
					},
				};

				checkForSuccess(response);
				checkProperAggregatedData(aggregatedData);
				compareAggregatedData(aggregatedData, expectations);
				expect(aggregatedData.impressions.total).to.not.equal(
					previousExpectation.impressions.total
				);
			});
		});

		describe('should be successful and return proper data [clientkey]', () => {
			it('Check data properties', async () => {
				options.qs = {
					subjectkey: seed.fkey.subject,
					clientkey: seed.fkey.client,
				};

				let response = await request(options);
				aggregatedData = response.data;
				checkForSuccess(response);
				checkProperAggregatedData(aggregatedData);
			});

			it('Check data contents (client specific)', async () => {
				let clientSpecificKey = 'ntblclient';
				let clientSpecificImpressions = 2;

				for (let i = 1; i <= clientSpecificImpressions; i++) {
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
							client_key: clientSpecificKey,
						},
					});
				}

				options.qs = {
					subjectkey: seed.fkey.subject,
					clientkey: clientSpecificKey,
				};

				let response = await request(options);
				aggregatedData = response.data;

				// Set our expectations
				let expectations = {
					impressions: {
						total: clientSpecificImpressions,
						first: aggregatedData.impressions.first,
						last: aggregatedData.impressions.last,
					},
					rating_stats: {
						parker_val: {
							avg: seed.rating_stats.parker_val.avg,
							min: seed.rating_stats.parker_val.avg,
							max: seed.rating_stats.parker_val.avg,
						},
						balance: {
							avg: seed.rating_stats.balance.avg,
							min: seed.rating_stats.balance.avg,
							max: seed.rating_stats.balance.avg,
						},
						length: {
							avg: seed.rating_stats.length.avg,
							min: seed.rating_stats.length.avg,
							max: seed.rating_stats.length.avg,
						},
						intensity: {
							avg: seed.rating_stats.intensity.avg,
							min: seed.rating_stats.intensity.avg,
							max: seed.rating_stats.intensity.avg,
						},
						terroir: {
							avg: seed.rating_stats.terroir.avg,
							min: seed.rating_stats.terroir.avg,
							max: seed.rating_stats.terroir.avg,
						},
						complexity: {
							avg: seed.rating_stats.complexity.avg,
							min: seed.rating_stats.complexity.avg,
							max: seed.rating_stats.complexity.avg,
						},
					},
				};

				checkForSuccess(response);
				checkProperAggregatedData(aggregatedData);
				compareAggregatedData(aggregatedData, expectations);
				expect(aggregatedData.impressions.total).to.not.equal(
					previousExpectation.impressions.total
				);
			});
		});

		describe('should be successful and return proper data [producerkey]', () => {
			it('Check data properties', async () => {
				options.qs = {
					subjectkey: seed.fkey.subject,
					producerkey: seed.fkey.producer,
				};

				let response = await request(options);
				aggregatedData = response.data;
				checkForSuccess(response);
				checkProperAggregatedData(aggregatedData);
			});

			it('Check data contents (producer specific)', async () => {
				let producerSpecificKey = 'ntblproducer';
				let producerSpecificImpressions = 1;

				for (let i = 1; i <= producerSpecificImpressions; i++) {
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
							producer_key: producerSpecificKey,
						},
					});
				}

				options.qs = {
					subjectkey: seed.fkey.subject,
					producerkey: producerSpecificKey,
				};

				let response = await request(options);
				aggregatedData = response.data;

				// Set our expectations
				let expectations = {
					impressions: {
						total: producerSpecificImpressions,
						first: aggregatedData.impressions.first,
						last: aggregatedData.impressions.last,
					},
					rating_stats: {
						parker_val: {
							avg: seed.rating_stats.parker_val.avg,
							min: seed.rating_stats.parker_val.avg,
							max: seed.rating_stats.parker_val.avg,
						},
						balance: {
							avg: seed.rating_stats.balance.avg,
							min: seed.rating_stats.balance.avg,
							max: seed.rating_stats.balance.avg,
						},
						length: {
							avg: seed.rating_stats.length.avg,
							min: seed.rating_stats.length.avg,
							max: seed.rating_stats.length.avg,
						},
						intensity: {
							avg: seed.rating_stats.intensity.avg,
							min: seed.rating_stats.intensity.avg,
							max: seed.rating_stats.intensity.avg,
						},
						terroir: {
							avg: seed.rating_stats.terroir.avg,
							min: seed.rating_stats.terroir.avg,
							max: seed.rating_stats.terroir.avg,
						},
						complexity: {
							avg: seed.rating_stats.complexity.avg,
							min: seed.rating_stats.complexity.avg,
							max: seed.rating_stats.complexity.avg,
						},
					},
				};

				checkForSuccess(response);
				checkProperAggregatedData(aggregatedData);
				compareAggregatedData(aggregatedData, expectations);
				expect(aggregatedData.impressions.total).to.not.equal(
					previousExpectation.impressions.total
				);
			});
		});

		it('should be successful if optional field is missing [eventkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				clientkey: seed.fkey.client,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is missing [clientkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: seed.fkey.event,
				producerkey: seed.fkey.producer,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is missing [producerkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				clientkey: seed.fkey.client,
				eventkey: seed.fkey.event,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is present and value is empty [eventkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: '',
				clientkey: seed.fkey.client,
				producerkey: seed.fkey.producer,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is present and value is empty [clientkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: seed.fkey.event,
				clientkey: '',
				producerkey: seed.fkey.producer,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is present and value is empty [producerkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: seed.fkey.event,
				clientkey: seed.fkey.client,
				producerkey: '',
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is present and value is empty whitespace [eventkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: ' ',
				clientkey: seed.fkey.client,
				producerkey: seed.fkey.producer,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is present and value is empty whitespace [clientkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: seed.fkey.event,
				clientkey: ' ',
				producerkey: seed.fkey.producer,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is present and value is empty whitespace [producerkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: seed.fkey.event,
				clientkey: seed.fkey.client,
				producerkey: ' ',
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is present and value is null [eventkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: null,
				clientkey: seed.fkey.client,
				producerkey: seed.fkey.producer,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is present and value is null [clientkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: seed.fkey.event,
				clientkey: null,
				producerkey: seed.fkey.producer,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful if optional field is present and value is null [producerkey]', async () => {
			options.qs = {
				subjectkey: seed.fkey.subject,
				eventkey: seed.fkey.event,
				clientkey: seed.fkey.client,
				producerkey: null,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful and case-insensitive [subjectkey]', async () => {
			options.qs = {
				SuBjECTkey: seed.fkey.subject,
				eventkey: seed.fkey.event,
				clientkey: seed.fkey.client,
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful and case-insensitive [eventkey]', async () => {
			options.qs = {
				subjectkey: 'BBC',
				EvenTKey: 'BBD',
				clientkey: 'BBE',
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful and case-insensitive [clientkey]', async () => {
			options.qs = {
				subjectkey: 'BBC',
				eventkey: 'BBD',
				cLienTkEy: 'BBE',
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		it('should be successful and case-insensitive [producerkey]', async () => {
			options.qs = {
				subjectkey: 'BBC',
				eventkey: 'BBD',
				clientkey: 'BBE',
				pRoDUceRKeY: 'BBF',
			};

			let response = await request(options);
			aggregatedData = response.data;
			checkForSuccess(response);
			checkProperAggregatedData(aggregatedData);
		});

		// Negative Tests
		it('should return an error if [origin] contains non-whitelisted value', async () => {
			options.uri = baseUrl + '/impression/aggregated/' + makeUniqueString(127);
			options.qs = {
				subjectkey: 'BBC',
				eventkey: 'BBD',
				clientkey: 'BBE',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [origin] contains whitelisted value (case sensitive)', async () => {
			options.uri = baseUrl + '/impression/aggregated/tst';
			options.qs = {
				subjectkey: 'BBC',
				eventkey: 'BBD',
				clientkey: 'BBE',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [subjectkey] missing', async () => {
			options.qs = {
				eventkey: 'BBD',
				cLienTkEy: 'BBE',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [subjectkey] is in invalid format', async () => {
			options.qs = {
				subjectkey: '!@#$',
				eventkey: 'BBD',
				clientkey: 'BBE',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [eventkey] is in invalid format', async () => {
			options.qs = {
				subjectkey: 'BBC',
				eventkey: '!@#$',
				clientkey: 'BBE',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [clientkey] is in invalid format', async () => {
			options.qs = {
				subjectkey: 'BBC',
				eventkey: 'BBD',
				clientkey: '!@#$',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [producerkey] is in invalid format', async () => {
			options.qs = {
				subjectkey: 'BBC',
				eventkey: 'BBD',
				clientkey: 'BBE',
				producerkey: '!@#$',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [subjectkey] exceeds 127 characters', async () => {
			options.qs = {
				subjectkey: 'a'.repeat(128),
				eventkey: 'BBD',
				clientkey: 'BBE',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [eventkey] exceeds 127 characters', async () => {
			options.qs = {
				subjectkey: 'BBC',
				eventkey: 'a'.repeat(128),
				clientkey: 'BBE',
				producerkey: 'BBF',
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [clientkey] exceeds 127 characters', async () => {
			options.qs = {
				subjectkey: 'BBC',
				eventkey: 'BBD',
				clientkey: 'a'.repeat(128),
			};

			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if [producerkey] exceeds 127 characters', async () => {
			options.qs = {
				subjectkey: 'BBC',
				eventkey: 'BBD',
				clientkey: 'BBE',
				producerkey: 'a'.repeat(128),
			};

			await checkStatusCodeByOptions(options, 400);
		});
	});
});
