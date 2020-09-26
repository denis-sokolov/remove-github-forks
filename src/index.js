'use strict';

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

const _apiGet = async (token, options = {}) => {
	options.progress = options.progress || (() => {});
	options.warnings = options.warnings || (() => {});

	const github = githubFactory(token);

	// Get all repositories
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
	const processedForks = forks.map(async (fork) => {
		try {
			if (await shouldDeleteFork(github, fork)) {
				// Map to our simple objects
				return {
					owner: fork.owner.login,
					repo: fork.name,
					url: fork.html_url
				};
			}
		} catch (error) {
			options.warnings(`Failed to inspect ${fork.name}, skipping`, error);
		} finally {
			forkDone(fork);
		}
	});

	const forksToDelete = await Promise.all(processedForks);
	return forksToDelete.filter(Boolean);
};

const _apiRemove = async (token, repos) => {
	const github = githubFactory(token);
	await Promise.all(
		repos.map((repo) =>
			github.repos.delete({owner: repo.owner, repo: repo.repo})
		)
	);
};

/* eslint-disable promise/catch-or-return, promise/prefer-await-to-then, promise/always-return, promise/no-callback-in-promise */
api.remove = (token, repos, callback) => {
	_apiRemove(token, repos).then((result) => {
		callback(null, result);
	}, callback);
};

api.get = (token, options, callback) => {
	if (!callback) {
		callback = options;
		options = {};
	}

	_apiGet(token, options).then((result) => {
		callback(null, result);
	}, callback);
};
/* eslint-enable promise/catch-or-return, promise/prefer-await-to-then, promise/always-return, promise/no-callback-in-promise */

module.exports = api;
