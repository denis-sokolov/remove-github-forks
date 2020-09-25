const {Octokit} = require('@octokit/rest');
const {throttling} = require('@octokit/plugin-throttling');
const ThrottledOctokit = Octokit.plugin(throttling);

module.exports = (token) => {
	// Allow to inject a GitHub API instead of a token
	if (token.repos) {
		return token;
	}

	return new ThrottledOctokit({
		auth: token,
		version: '3.0.0',
		throttle: {
			onRateLimit: (retryAfter, options, octokit) => {
				octokit.log.warn(
					`Request quota exhausted for request ${options.method} ${options.url}`
				);

				if (options.request.retryCount === 0) {
					// Only retries once
					octokit.log.info(`Retrying after ${retryAfter} seconds!`);
					return true;
				}
			},
			onAbuseLimit: (retryAfter, options, octokit) => {
				// Does not retry, only logs a warning
				octokit.log.warn(
					`Abuse detected for request ${options.method} ${options.url}`
				);
			}
		}
	});
};
