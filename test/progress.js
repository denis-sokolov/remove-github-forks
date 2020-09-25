const test = require('ava');
const removeGithubForks = require('..');
const lib = require('./lib');

test.cb('should report progress', (t) => {
	const mock = lib.mock({
		listBranches: [],
		delete: true
	});

	let progressCallCount = 0;

	removeGithubForks(
		mock.present,
		{
			progress(info) {
				if (progressCallCount === 0) {
					t.is(info.countInspected, 0);
					t.is(info.totalToInspect, 1);
				} else {
					t.is(info.countInspected, 1);
					t.is(info.totalToInspect, 1);
					t.is(info.lastInspected, 'fork1');
					t.end();
				}

				progressCallCount += 1;
			}
		},
		() => {}
	);
});
