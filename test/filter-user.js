const test = require('ava');
const removeGithubForks = require('..');
const lib = require('./helpers');

test.cb('should not delete a fork if user option given', (t) => {
	const mock = lib.mock({
		listBranches: [],
		delete: true
	});

	removeGithubForks(mock.present, {user: 'john-snow'}, () => {
		lib.check(t, mock.calls(), [
			['listForAuthenticatedUser', {type: 'public'}]
		]);
		t.end();
	});
});
