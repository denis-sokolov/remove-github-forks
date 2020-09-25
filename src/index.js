'use strict';

const async = require('async');

const githubFactory = require('./github-factory');
const shouldDeleteFork = require('./should-delete-fork');

const api = (token, options, callback) => {
	if (!callback) {
		callback = options;
		options = {};
	}

	api.get(token, options, (error, repos) => {
		if (error) {
			return callback(error);
		}

		api.remove(token, repos, callback);
	});
};

api.get = async (token, options, getCallback) => {
	if (!getCallback) {
		getCallback = options;
		options = {};
	}

	options.progress = options.progress || (() => {});
	options.warnings = options.warnings || (() => {});

	const github = githubFactory(token);

	// Get all repositories
	try {
		const repos = await github.paginate(github.repos.listForAuthenticatedUser, {
			type: 'public'
		});
		// Keep only forks
		let forks = repos.filter(({fork}) => fork);

		// Keep only forks owned by a specified user
		if (options.user) {
			forks = forks.filter(({owner}) => owner.login === options.user);
		}

		let countDoneForks = 0;
		options.progress({
			countInspected: 0,
			totalToInspect: forks.length
		});
		const forkDone = (fork) => {
			countDoneForks += 1;
			options.progress({
				countInspected: countDoneForks,
				lastInspected: fork.name,
				totalToInspect: forks.length
			});
		};

		// Keep only useless forks
		async.filter(
			forks,
			(fork, filterCallback) => {
				shouldDeleteFork(github, fork, (error, result) => {
					if (error) {
						options.warnings(`Failed to inspect ${fork.name}, skipping`, error);
						result = false;
					}

					forkDone(fork);
					filterCallback(null, result);
				});
			},
			(error, forksToDelete) => {
				if (error) {
					return getCallback(error);
				}

				// Map to our simple objects
				const response = forksToDelete.map((fork) => ({
					owner: fork.owner.login,
					repo: fork.name,
					url: fork.html_url
				}));
				getCallback(null, response);
			}
		);
	} catch (error) {
		getCallback(error);
	}
};

api.remove = async (token, repos, removeCallback) => {
	const github = githubFactory(token);
	try {
		await Promise.all(
			repos.map((repo) =>
				github.repos.delete({owner: repo.owner, repo: repo.repo})
			)
		);
		removeCallback();
	} catch (error) {
		removeCallback(error);
	}
};

module.exports = api;
