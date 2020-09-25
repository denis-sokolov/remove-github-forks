exports.USER = {login: 'current-user'};
exports.AUTHOR = {login: 'cool-author'};
exports.COMMIT_A = {sha: 'abcdef1'};
exports.COMMIT_B = {sha: 'abcdef2'};
exports.COMMIT_C = {sha: 'abcdef3'};

// No reason to believe JSON.stringify will order map properties in the same order
// This should be replaced with a custom function
const hash = (r) => JSON.stringify(r);

const sortingFunction = (a, b) => hash(a).localeCompare(hash(b));

const fail = (t, message, parameter) => {
	console.error(message + ':', parameter);
	t.fail(message);
};

exports.check = (t, actual, expected) => {
	actual.sort(sortingFunction);
	expected.sort(sortingFunction);

	let failed = false;

	/* eslint no-console: 0 */
	actual.forEach((actualRequest, i) => {
		if (failed) {
			return;
		}

		if (expected.length < i + 1) {
			return fail(
				t,
				'Unexpected request found ' + JSON.stringify(actualRequest)
			);
		}

		if (hash(actualRequest) === hash(expected[i])) {
			return;
		}

		failed = true;

		// Fallback for older Node
		if (!Array.prototype.some) {
			return fail(t, 'Incorrect request ' + JSON.stringify(actualRequest));
		}

		const currentRequestIsExpectedButNotNow = expected
			.slice(i + 1)
			.some((attempt) => hash(actualRequest) === hash(attempt));
		if (currentRequestIsExpectedButNotNow) {
			return fail(t, 'Missing request ' + JSON.stringify(expected[i]));
		}

		fail(t, 'Unexpected request ' + JSON.stringify(actualRequest));
	});

	if (expected.length > actual.length) {
		fail(t, 'Too few requests');
	}
};

exports.mock = (responses) => {
	responses.listForAuthenticatedUser = responses.listForAuthenticatedUser || [
		{name: 'non-fork', fork: false},
		{name: 'fork1', fork: true, owner: exports.USER}
	];
	responses.get = responses.get || {
		name: 'fork1',
		owner: exports.USER,
		parent: {name: 'upstream-lib', owner: exports.AUTHOR}
	};

	const calls = [];

	const buildResponder = (name, responsePassed) => (callData, callback) => {
		calls.push([name, callData]);
		const methodsWithoutDataField = ['listForAuthenticatedUser'];
		const data =
			typeof responsePassed === 'function'
				? responsePassed.call(null, callData)
				: responsePassed;
		const response = methodsWithoutDataField.includes(name) ? data : {data};
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(response);
				if (callback) {
					callback(null, response);
				}
			}, 0);
		});
	};

	const buildRejecter = (name) => () => {
		throw new Error(`did not expect to have ${name} called`);
	};

	const repos = {
		compareCommits: buildRejecter('compareCommits'),
		delete: buildRejecter('delete'),
		get: buildRejecter('get'),
		listForAuthenticatedUser: buildRejecter('listForAuthenticatedUser'),
		listBranches: buildRejecter('listBranches')
	};
	Object.keys(responses).forEach((name) => {
		repos[name] = buildResponder(name, responses[name]);
	});

	return {
		calls() {
			return calls;
		},
		present: {
			paginate(f, ...arguments_) {
				return f(...arguments_);
			},
			repos
		}
	};
};
