const chai = require('chai');
const expect = chai.expect;
const request = require('request-promise');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

describe('Database', async function () {
	it('Should be able to reseed', async () => {
		// Reload seeder classes before reseeding
		await exec('php composer.phar dump-autoload');

		// Check Seed Console Output
		let seedOutput = await exec('php artisan db:seed --force');
		expect(seedOutput.stderr).to.equal('');
		expect(seedOutput.stdout.search('Database seeding completed successfully')).to.be.greaterThan(
			0
		);
	});
});
