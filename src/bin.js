#!/usr/bin/env node
/* eslint no-console: 0, no-process-exit: 0 */
'use strict';

const program = require('commander');
const confirm = require('confirm-simple');
const singleLineLog = require('single-line-log').stdout;

const clean = require('.');
const meta = require('../package.json');

program
	.version(meta.version)
	.usage('token')
	.option('--debug', 'Output extended error details')
	.option('--user <value>', 'Only cleanup given user or organization')
	.option('-y, --yes', 'Do not ask for confirmation')
	.parse(process.argv);

program.on('--help', () => {
	console.log('  Please get the OAuth token:');
	console.log('');
	console.log('  Head to https://github.com/settings/tokens/new');
	console.log('  Create a token with permissions public_repo, delete_repo');
	console.log('  Pass that in the CLI, enjoy!');
	console.log('');
});

if (program.args.length !== 1) {
	program.help();
}

const token = program.args[0];

const abort = error => {
	console.error(program.debug ? error : error.message || error);
	process.exit(1);
};

const assureConfirmation = (repos, callback) => {
	if (program.yes) {
		return callback();
	}

	confirm(
		'Delete these forks: \n' +
			repos.map(repo => '    ' + repo.url).join('\n') +
			'\n',
		confirmed => {
			if (!confirmed) {
				return abort('Aborting.');
			}

			callback();
		}
	);
};

try {
	clean.get(
		token,
		{
			progress({countInspected, totalToInspect, lastInspected}) {
				singleLineLog(
					`Inspected ${countInspected}/${totalToInspect}${
						lastInspected ? ` (${lastInspected})` : ''
					}\n`
				);
			},
			user: program.user,
			warnings(message, error) {
				console.error(message, error);
			}
		},
		(error, repos) => {
			if (error) {
				return abort(error);
			}

			if (repos.length === 0) {
				console.log('No useless repositories found.');
				process.exit(0);
			}

			assureConfirmation(repos, () => {
				clean.remove(token, repos, errorDeleting => {
					if (errorDeleting) {
						return abort(errorDeleting);
					}

					console.log('Done!');
					process.exit(0);
				});
			});
		}
	);
} catch (error) {
	abort(error);
}
