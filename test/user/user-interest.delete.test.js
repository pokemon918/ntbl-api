const expect = require('chai').expect;
const request = require('request-promise');
const {getAuthCreationPayload} = require('../../ntbl_client/ntbl_api.js');
const {
	baseUrl,
	basePostOptions,
	createItem,
	generateUserData,
	makeUniqueString,
	login,
	signPath,
	checkForSuccess,
	checkStatusCodeByOptions,
} = require('../common.js');

describe('User Interest', () => {
	describe('POST', () => {
		let options,
			postOptions,
			path,
			user,
			userData,
			userUpdatedData,
			userB,
			userBData,
			deleteUserInterestPath,
			updateUserInterest;

		before(async () => {
			options = {...basePostOptions};
			postOptions = {...basePostOptions};
			let createUserPath = baseUrl + '/user';
			deleteUserInterestPath = '/user/interests';

			//Create test users
			user = generateUserData();
			userData = await createItem(createUserPath, user, true);
			userB = generateUserData();
			userBData = await createItem(createUserPath, userB, true);

			updateUserInterest = async () => {
				//Populate and update the user's interest
				let updateProfilePayload = {
					interests: [
						{
							value: 'Denmark',
							key: 'country',
						},
						{
							value: 'true',
							key: 'newsletter',
						},
					],
				};

				let updateUserProfilePath = '/user/profile';
				postOptions.uri = signPath(updateUserProfilePath, 'POST');
				postOptions.body = updateProfilePayload;
				let results = await request(postOptions);
				userUpdatedData = results.data.user;

				let interestRefs = userUpdatedData.interests.map((interest) => {
					return interest.ref;
				});

				return interestRefs;
			};
		});

		beforeEach(async () => {
			//Login main
			await login(user.email, user.rawPass);
			let interestRefs = await updateUserInterest();
			options.body = {
				interest_refs: interestRefs,
			};
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath(deleteUserInterestPath, options.method);
		});

		it('should return correct status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful', async () => {
			let response = await request(options);
			checkForSuccess(response);
		});

		it('should return proper data', async () => {
			let interestsToDelete = options.body.interest_refs;
			let response = await request(options);
			response = response.data;

			expect(response).to.have.property('deleted_interests');
			expect(response.deleted_interests).to.be.an('array');

			for (let ctr = 0; ctr <= interestsToDelete.length - 1; ctr++) {
				let interestToDelete = interestsToDelete[ctr];
				expect(response.deleted_interests.includes(interestToDelete)).to.equal(true);
			}

			// Should no longer be in User's Profile
			options.method = 'GET';
			options.uri = signPath('/user/profile', options.method);
			let getResponse = await request(options);
			let newInterests = getResponse.interests.map((o) => o[ref]);
			for (let ctr = 0; ctr <= interestsToDelete.length - 1; ctr++) {
				let interestToDelete = interestsToDelete[ctr];
				expect(newInterests.includes(interestToDelete)).to.equal(false);
			}
		});

		/*
    |--------------------------------------------------------------------------
    | Negative tests
    |--------------------------------------------------------------------------
    */
		it('should return an error if payload is empty', async () => {
			options.body = {};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if interest_refs is empty', async () => {
			options.body = {
				interest_refs: '',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if interest_refs is null', async () => {
			options.body = {
				interest_refs: null,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if interest_refs is an empty array', async () => {
			options.body = {
				interest_refs: [],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if interest_refs is a string', async () => {
			options.body = {
				interest_refs: 'astring',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if interest_refs is a number', async () => {
			options.body = {
				interest_refs: 1234,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a non-existing interest ref is included in the payload', async () => {
			options.body.interest_refs.push(makeUniqueString(6));
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if an invalid interest ref is included in the payload', async () => {
			options.body.interest_refs.push('#$#Uijsdkl!');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if tried to delete already deleted interest', async () => {
			options.body.interest_refs;
			await checkStatusCodeByOptions(options, 200);

			// Try to delete for the second time
			options.uri = signPath(deleteUserInterestPath, options.method);
			await checkStatusCodeByOptions(options, 400);
		});

		it("should return an error if tried to delete another user's interests", async () => {
			// login a different user and populate its interest
			await login(userB.email, userB.rawPass);
			let interestRefs = await updateUserInterest();

			// login the main user back and try to delete the other user's interest
			await login(user.email, user.rawPass);
			options.body = {
				interest_refs: interestRefs,
			};
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
