const expect = require('chai').expect;
const request = require('request-promise');
const {baseUrl, baseGetOptions, createItem, checkStatusCodeByOptions} = require('../common.js');

const reservedWords = [
	'break',
	'do',
	'instanceof',
	'typeof',
	'case',
	'else',
	'new',
	'var',
	'catch',
	'finally',
	'return',
	'void',
	'continue',
	'for',
	'switch',
	'while',
	'debugger',
	'function',
	'this',
	'with',
	'default',
	'if',
	'throw',
	'delete',
	'in',
	'try',
	'class',
	'enum',
	'extends',
	'super',
	'const',
	'export',
	'import',
	'implements',
	'let',
	'private',
	'public',
	'yield',
	'interface',
	'package',
	'protected',
	'static',
	'null',
	'true',
	'false',
];

const jsonp = (data) => {
	return 'running jsonp';
};

const callback = (data) => {
	return 'running callback';
};

const callback_test = (data) => {
	return 'running callback_test';
};

const callBackTest = (data) => {
	return 'running camelCased, upperCased callBackTest';
};

describe('JSONP', () => {
	let options, callbackName;

	before(() => {
		callbackName = 'callback_test';
		options = {...baseGetOptions};
		options.uri = baseUrl + '/tastingnote/testkey1?jsonp=' + callbackName;
	});

	describe('behavior', () => {
		beforeEach(async () => {
			options.transform = null;
		});

		it('should return correct success status code', async () => {
			options.transform = (body, response, resolveWithFullResponse) => {
				return response;
			};
			await checkStatusCodeByOptions(options, 200);
		});

		it('should return a callback and run it', async () => {
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running callback_test');
		});

		it("should return a callback and run it if callback is named 'callback'", async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback=' + callbackName;
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running callback_test');
		});

		it("should return a callback that evaluates to 'jsonp' if callback value is nil", async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jsonp';
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running jsonp');
		});

		it("should return a callback that evaluates to 'callback' if callback value is nil", async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback';
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running callback');
		});

		it("should return a callback that evaluates to 'jsonp' if callback value is nil and has '=' at the end", async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jsonp=';
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running jsonp');
		});

		it("should return a callback that evaluates to 'callback' if callback value is nil and has '=' at the end", async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback=';
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running callback');
		});

		it('should return a callback and run it if callback value is camelCased or if it has capital letters', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback=callBackTest';
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running camelCased, upperCased callBackTest');
		});

		it('should return a callback and run it if jsonp value is camelCased or if it has capital letters', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jsonp=callBackTest';
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running camelCased, upperCased callBackTest');
		});

		it('should return a callback and run it if callback name has capital letters', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?caLlBaCk=' + callbackName;
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running callback_test');
		});

		it('should return a callback and run it if if jsonp name has capital letters', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jSoNp=' + callbackName;
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running callback_test');
		});

		it("should return a callback that evaluates to 'callback' if callback value is nil and callback name has capital letters", async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?cAlLbaCk';
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running callback');
		});

		it("should return a callback that evaluates to 'jsonp' if callback value is nil and callback name has capital letters", async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jSoNp';
			let response = await request(options);
			let callBackResult = eval(response);
			expect(callBackResult).to.equal('running jsonp');
		});

		it('should return error if callback value has dash or minus(-) symbol', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback=call-back';
			await checkStatusCodeByOptions(options, 400);
		});

		it("should return error if callback value has single quote (')", async () => {
			options.uri = baseUrl + "/tastingnote/testkey1?callback=call'back";
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if callback value has double quote (")', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback=call"back';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if jsonp value has dash or minus(-) symbol', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jsonp=call-back';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if callback value has plus(+) symbol', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback=call+back';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if jsonp value has plus(+) symbol', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jsonp=call+back';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if callback value has % symbol', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback=%call%back';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if jsonp value has % symbol', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jsonp=%call%back';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if callback value has illegal chars', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback=ca*llb^ac%k_t#$es%t';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if jsonp value has illegal chars', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jsonp=ca*llb^ac%k_t#$es%t';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if callback value is wrapped in double qoutes', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?callback="callback_test"';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if jsonp value is wrapped in double qoutes', async () => {
			options.uri = baseUrl + '/tastingnote/testkey1?jsonp="callback_test"';
			await checkStatusCodeByOptions(options, 400);
		});

		it('should return error if callback value is a Javascript reserved word', async () => {
			reservedWords.forEach(async (reservedWord) => {
				options.uri = baseUrl + '/tastingnote/testkey1?callback=' + reservedWord;
				await checkStatusCodeByOptions(options, 400);
			});
		});
	});
});
