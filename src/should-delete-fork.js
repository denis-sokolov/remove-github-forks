'use strict';

const async = require('async');

const branchIsUseful = (github, repo, branch, parentBranches, callback) => {
	const someParentBranchAtThisSha =
		parentBranches.filter((candidate) => {
			return branch.commit.sha === candidate.commit.sha;
		}).length === 1;

	if (someParentBranchAtThisSha) {
		return callback(null, false);
	}

	// Check if at least one parent branch contains this commit
	// Looping through all parent branches is immensely slow,
	// let's take a safe shortcut
	const branchesToCheck = parentBranches.filter((b) => {
		return [branch.name, 'master'].includes(b.name);
	});
	async.some(
		branchesToCheck,
		(candidate, someCallback) => {
			github.repos.compareCommits(
				{
					owner: repo.parent.owner.login,
					repo: repo.parent.name,
					base: branch.commit.sha,
					head: candidate.name
				},
				(error, diff) => {
					if (error) {
						// If diff can't be found, means our commit is not on this
						// parent branch candidate
						if (error.status === 404) {
							return someCallback(null, false);
						}

						return someCallback(error);
					}

					// If parent is not behind us, this parent candidate
					// branch contains our branch
					someCallback(null, !diff.behind_by);
				}
			);
		},
		(error, parentContainsOurCommit) => {
			if (error) {
				callback(error);
			} else {
				callback(null, !parentContainsOurCommit);
			}
		}
	);
};

module.exports = (github, fork, shouldDeleteCallback) => {
	async.waterfall(
		[
			// Grab the repository information
			(callback) => {
				github.repos.get({owner: fork.owner.login, repo: fork.name}, callback);
			},

			// Grab all branches
			(repo, callback) => {
				github.repos.listBranches(
					{
						owner: repo.owner.login,
						repo: repo.name,
						per_page: 100
					},
					(error, branches) => {
						if (error) {
							return callback(error);
						}

						if (branches.length === 100) {
							// There are too many branches,
							// dealing with pagination is not supported
							shouldDeleteCallback(null, false);
							return;
						}

						callback(null, repo, branches);
					}
				);
			},

			// Grab all parent repository branches
			(repo, branches, callback) => {
				github.repos.listBranches(
					{
						owner: repo.parent.owner.login,
						repo: repo.parent.name,
						per_page: 100
					},
					(error, parentbranches) => {
						// If parent repository was deleted, need to preserve the fork
						if (error && error.status == 404) {
							shouldDeleteCallback(null, false);
							return;
						}

						callback(error, repo, branches, parentbranches);
					}
				);
			},

			// Compare if for each local branch is useless
			(repo, branches, parentbranches, callback) => {
				// Quick common case
				if (branches.length > parentbranches.length) {
					callback(null, true);
					return;
				}

				async.some(
					branches,
					(branch, someCallback) => {
						branchIsUseful(
							github,
							repo,
							branch,
							parentbranches,
							(error, useful) => {
								if (error) {
									return someCallback(error);
								}

								someCallback(null, useful);
							}
						);
					},
					callback
				);
			}
		],
		(error, someBranchesUseful) => {
			if (error) {
				shouldDeleteCallback(error);
			} else {
				shouldDeleteCallback(null, !someBranchesUseful);
			}
		}
	);
};
