#!/usr/bin/env node

import {spawn, exec} from 'child_process';
import * as os from 'os';
import * as globs from 'globs';
import * as minimist from 'minimist';
import Chiqq from 'chiqq';
import * as chalk from 'chalk';

const argv = minimist(process.argv.slice(2));
const poolSize = argv.poolsize || os.cpus().length || 4;
const port = parseInt(process.env.PORT || '8000') + 1;
let pool = new Chiqq({concurrency: poolSize, retryMax: 3});

if (argv.backend)
	for (let i = port; i < port + poolSize; i++) {
		exec(`${argv.backend}:${i}`);
	}

let cliArgs = [];
Object.keys(argv).forEach((k) => {
	if (['_', 'backend', 'poolsize', 'forcePass', 'simulate'].includes(k)) return;

	if (k.length == 1) {
		cliArgs.push('-' + k);
	} else {
		cliArgs.push('--' + k);
	}

	if (argv[k] === true) return;

	cliArgs.push(argv[k]);
});

let files = globs.sync(argv._);

let res = files.map((f, index) =>
	pool.add(
		async () =>
			new Promise((ok, notOk) => {
				const n = index + 1;
				const id = `${n}/${files.length})`;
				let cmd = ['npx', 'mocha', ...cliArgs, f];

				argv.simulate && cmd.unshift('echo');

				let run = spawn(cmd[0], cmd.slice(1), {
					env: {
						...process.env,
						FORCE_COLOR: 'true',
						PORT: argv.backend ? '' + (port + (index % poolSize)) : process.env.PORT,
					},
				});

				console.log(chalk.gray(`${id} Start: ` + f));

				let stdout = '';
				let stderr = '';

				run.stdout.on('data', (data) => {
					stdout += data;
				});

				run.stderr.on('data', (data) => {
					stderr += data;
				});

				run.on('close', (code: number) => {
					console.log('');
					console.log(chalk.gray(`${id} Result: ` + f));

					console.log(chalk.gray('\n  ' + cmd.join(' ')));
					run.stdout && console.log(stdout.toString());
					run.stderr && console.error(stderr.toString());

					//console.dir(pool.insight())

					if (!argv.forcePass && code) {
						notOk(cmd.join(' '));
					}

					ok({
						f,
						cmd: cmd.join(' '),
						exitCode: code,
						n,
						id,
						total: files.length,
						stderr: stderr.toString(),
						stdout: stdout.toString(),
					});
				});
			})
	)
);

Promise.all(res)
	.then((status) => {
		console.log(chalk.green(`Done running ${res.length} test files`));

		if (argv.forcePass) {
			let errors = status.filter((s: any) => s.exitCode);

			errors.length &&
				console.log(
					`\nErrors was found in the following ${errors.length} test files but was forced to pass\n`
				);

			errors.forEach((s: any) => {
				console.log(`${s.id} ${s.f}`);
				console.log(`  ${s.cmd}\n`);
			});
		}

		process.exit(0);
	})
	.catch((e) => {
		console.error(chalk.red('Problem running:\n  ' + e));

		console.error(`\nRun the command with --forcePass to ignore errors.\n`);
		process.exit(1);
	});
