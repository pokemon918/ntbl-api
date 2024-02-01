const chai = require('chai');
const fs = require('fs');

before(function () {
	if (!fs.existsSync('.env')) {
		throw new Error('Enviornment Variables File Does Not Exist');
	}
});
