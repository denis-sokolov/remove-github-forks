'use strict';

const branchIsUseful = async (github, repo, branch, parentBranches) => {
	const someParentBranchAtThisSha =
		parentBranches.filter(candidate => {
			return branch.commit.sha === candidate.commit.sha;
		}).length === 1;

	if (someParentBranchAtThisSha) {
		return false;
	}

	// Check if at least one parent branch contains this commit
	// Looping through all parent branches is immensely slow,
	// let's take a safe shortcut
	const branchesToCheck = parentBranches.filter(b => {
		return [branch.name, 'master'].includes(b.name);
	});
	for (const candidate of branchesToCheck) {
		try {
			// eslint-disable-next-line no-await-in-loop
			const {data: diff} = await github.repos.compareCommits({
				owner: repo.parent.owner.login,
				repo: repo.parent.name,
				base: branch.commit.sha,
				head: candidate.name
			});
			// If parent is not behind us, this parent candidate
			// branch contains our branch
			if (diff.behind_by) {
				return true;
			}
		} catch (error) {
			// If diff can't be found, means our commit is not on this
			// parent branch candidate
			if (error.status === 404) {
				continue;
			}

			throw error;
		}
	}

	return false;
};

module.exports = async (github, fork) => {
	// Grab the repository information
	const {data: repo} = await github.repos.get({
		owner: fork.owner.login,
		repo: fork.name
	});

	// Grab all branches
	const {data: branches} = await github.repos.listBranches({
		owner: repo.owner.login,
		repo: repo.name,
		per_page: 100
	});

	if (branches.length === 100) {
		// There are too many branches,
		// dealing with pagination is not supported
		return false;
	}

	// Grab all parent repository branches
	let parentbranches;
	try {
		({data: parentbranches} = await github.repos.listBranches({
			owner: repo.parent.owner.login,
			repo: repo.parent.name,
			per_page: 100
		}));
	} catch (error) {
		// If parent repository was deleted, need to preserve the fork
		if (error && error.status === 404) {
			return false;
		}

		throw error;
	}

	// Compare if for each local branch is useless
	if (branches.length > parentbranches.length) {
		// Quick common case
		return false;
	}

	for (const branch of branches) {
		// eslint-disable-next-line no-await-in-loop
		const useful = await branchIsUseful(github, repo, branch, parentbranches);
		if (useful) {
			return false;
		}
	}

	return true;
};
