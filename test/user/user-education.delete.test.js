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

describe('User Education', () => {
	describe('POST', () => {
		let options,
			postOptions,
			path,
			user,
			userData,
			userUpdatedData,
			userB,
			userBData,
			deleteUserEducationPath,
			updateUserEducation;

		before(async () => {
			options = {...basePostOptions};
			postOptions = {...basePostOptions};
			let createUserPath = baseUrl + '/user';
			deleteUserEducationPath = '/user/educations';

			//Create test users
			user = generateUserData();
			userData = await createItem(createUserPath, user, true);
			userB = generateUserData();
			userBData = await createItem(createUserPath, userB, true);

			updateUserEducation = async () => {
				//Populate and update the user's education
				let updateProfilePayload = {
					educations: [
						{
							school: makeUniqueString(),
							description: makeUniqueString(300),
							achievement: makeUniqueString(),
						},
						{
							school: makeUniqueString(),
							description: makeUniqueString(300),
							achievement: makeUniqueString(),
						},
					],
				};

				let updateUserProfilePath = '/user/profile';
				postOptions.uri = signPath(updateUserProfilePath, 'POST');
				postOptions.body = updateProfilePayload;
				let results = await request(postOptions);
				userUpdatedData = results.data.user;

				let educationRefs = userUpdatedData.educations.map((education) => {
					return education.ref;
				});

				return educationRefs;
			};
		});

		beforeEach(async () => {
			//Login main
			await login(user.email, user.rawPass);
			let educationRefs = await updateUserEducation();
			options.body = {
				education_refs: educationRefs,
			};
			options.transform = null;
			options.method = 'POST';
			options.uri = signPath(deleteUserEducationPath, options.method);
		});

		it('should return correct status code', async () => {
			await checkStatusCodeByOptions(options, 200);
		});

		it('should be successful', async () => {
			let response = await request(options);
			checkForSuccess(response);
		});

		it('should return proper data', async () => {
			let educationsToDelete = options.body.education_refs;
			let response = await request(options);
			response = response.data;

			expect(response).to.have.property('deleted_educations');
			expect(response.deleted_educations).to.be.an('array');

			for (let ctr = 0; ctr <= educationsToDelete.length - 1; ctr++) {
				let educationToDelete = educationsToDelete[ctr];
				expect(response.deleted_educations.includes(educationToDelete));
			}

			// Should no longer be in User's Profile
			options.method = 'GET';
			options.uri = signPath('/user/profile', options.method);
			let getResponse = await request(options);
			let newEducations = getResponse.educations.map((o) => o[ref]);
			for (let ctr = 0; ctr <= educationsToDelete.length - 1; ctr++) {
				let educationToDelete = educationsToDelete[ctr];
				expect(newEducations.includes(educationToDelete)).to.equal(false);
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

		it('should return an error if education_refs is empty', async () => {
			options.body = {
				education_refs: '',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if education_refs is null', async () => {
			options.body = {
				education_refs: null,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if education_refs is an empty array', async () => {
			options.body = {
				education_refs: [],
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if education_refs is a string', async () => {
			options.body = {
				education_refs: 'astring',
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if education_refs is a number', async () => {
			options.body = {
				education_refs: 1234,
			};
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if a non-existing education ref is included in the payload', async () => {
			options.body.education_refs.push(makeUniqueString(6));
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if an invalid education ref is included in the payload', async () => {
			options.body.education_refs.push('#$#Uijsdkl!');
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return an error if tried to delete already deleted education', async () => {
			options.body.education_refs;
			await checkStatusCodeByOptions(options, 200);

			// Try to delete for the second time
			options.uri = signPath(deleteUserEducationPath, options.method);
			await checkStatusCodeByOptions(options, 400);
		});

		it("should return an error if tried to delete another user's educations", async () => {
			// login a different user and populate its education
			await login(userB.email, userB.rawPass);
			let educationRefs = await updateUserEducation();

			// login the main user back and try to delete the other user's education
			await login(user.email, user.rawPass);
			options.body = {
				education_refs: educationRefs,
			};
			await checkStatusCodeByOptions(options, 400);
		});
	});
});
