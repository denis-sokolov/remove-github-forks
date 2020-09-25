const {Octokit} = require('@octokit/rest');
const queue = require('queue');

const rawGithubFactory = (token) => {
	// Allow to inject a GitHub API instead of a token
	if (token.repos) {
		return token;
	}

	return new Octokit({
		auth: token,
		version: '3.0.0'
	});
};

module.exports = (token) => {
	const api = rawGithubFactory(token);

	const q = queue({
		concurrency: 1,
		timeout: 2000
	});

	// Transform a github function call into a queued function call
	// to ensure that only one API call runs at a time
	// https://developer.github.com/guides/best-practices-for-integrators/#dealing-with-abuse-rate-limits
	const qd = (call) => {
		if (typeof call !== 'function') {
			throw new TypeError(`call should be a function: ${call}`);
		}

		return (...arguments_) =>
			new Promise((resolve, reject) => {
				q.push((callback) => {
					let argumentsCallback = arguments_.pop();
					if (typeof argumentsCallback !== 'function') {
						arguments_.push(argumentsCallback);
						argumentsCallback = null;
					}

					call.apply(null, arguments_).then(
						(result) => {
							callback();
							if (argumentsCallback) {
								argumentsCallback(null, result);
							}

							resolve(result);
						},
						(error) => {
							callback();
							if (argumentsCallback) {
								argumentsCallback(error);
							}

							reject(error);
						}
					);
				});
				q.start();
			});
	};

	const makeResponseTransformer = (transform) => (call) => {
		if (typeof call !== 'function') {
			throw new TypeError(`call should be a function: ${call}`);
		}

		return (...arguments_) => {
			let argumentsCallback = arguments_.pop();
			if (typeof argumentsCallback !== 'function') {
				arguments_.push(argumentsCallback);
				argumentsCallback = null;
			}

			return call.apply(null, arguments_).then(
				(result) => {
					result = transform(result);
					if (argumentsCallback) {
						argumentsCallback(null, result);
					}

					return result;
				},
				(error) => {
					if (argumentsCallback) {
						argumentsCallback(error);
					}
				}
			);
		};
	};

	// Unwrap .data in the response
	const nd = makeResponseTransformer(({data}) => data);

	// Add a warning about subtly invalid params
	const hw = (f) => (...arguments_) => {
		if (arguments_[0] && arguments_[0].url) {
			throw new Error('Avoid passing url option');
		}

		return f.apply(null, arguments_);
	};

	const paginate = (f) => (...arguments_) => api.paginate(f, ...arguments_);

	return {
		repos: {
			compareCommits: hw(nd(qd(api.repos.compareCommits))),
			delete: hw(nd(qd(api.repos.delete))),
			get: hw(nd(qd(api.repos.get))),
			list: hw(qd(paginate(api.repos.listForAuthenticatedUser))),
			listBranches: hw(nd(qd(api.repos.listBranches)))
		}
	};
};
