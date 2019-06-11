var GithubLib = require("@octokit/rest");
var queue = require("queue");

var rawGithubFactory = function(token) {
  // Allow to inject a GitHub API instead of a token
  if (token.repos) {
    return token;
  }

  return new GithubLib({
    auth: token,
    version: "3.0.0"
  });
};

module.exports = function(token) {
  var api = rawGithubFactory(token);

  var q = queue({
    concurrency: 1,
    timeout: 2000
  });

  // Transform a github function call into a queued function call
  // to ensure that only one API call runs at a time
  // https://developer.github.com/guides/best-practices-for-integrators/#dealing-with-abuse-rate-limits
  var qd = function(call) {
    if (typeof call !== "function")
      throw new Error("call should be a function: " + call);
    return function() {
      var args = [].slice.apply(arguments);
      return new Promise(function(resolve, reject) {
        q.push(function(cb) {
          var argsCb = args.pop();
          if (typeof argsCb !== "function") {
            args.push(argsCb);
            argsCb = null;
          }
          call.apply(null, args).then(
            function(result) {
              cb();
              if (argsCb) argsCb(null, result);
              resolve(result);
            },
            function(error) {
              cb();
              if (argsCb) argsCb(error);
              reject(error);
            }
          );
        });
        q.start();
      });
    };
  };

  var makeResponseTransformer = function(transform) {
    return function(call) {
      if (typeof call !== "function")
        throw new Error("call should be a function: " + call);
      return function() {
        var args = [].slice.apply(arguments);
        var argsCb = args.pop();
        if (typeof argsCb !== "function") {
          args.push(argsCb);
          argsCb = null;
        }
        return call.apply(null, args).then(
          function(result) {
            result = transform(result);
            if (argsCb) argsCb(null, result);
            return result;
          },
          function(err) {
            if (argsCb) argsCb(err);
          }
        );
      };
    };
  };

  // Unwrap .data in the response
  var nd = makeResponseTransformer(function(response) {
    return response.data;
  });

  // Add a warning about subtly invalid params
  var hw = function(f) {
    return function() {
      var args = arguments;
      if (args[0] && args[0].url) throw new Error("Avoid passing url option");
      return f.apply(null, args);
    };
  };

  var paginate = function(f) {
    function listPages(response) {
      if (!api.hasNextPage(response)) return Promise.resolve(response);
      return api
        .getNextPage(response)
        .then(function(nextResponse) {
          return listPages(nextResponse);
        })
        .then(function(fullResponse) {
          fullResponse.data = response.data.concat(fullResponse.data);
          return fullResponse;
        });
    }

    return function() {
      return f.apply(null, arguments).then(listPages);
    };
  };

  return {
    repos: {
      compareCommits: hw(nd(qd(api.repos.compareCommits))),
      delete: hw(nd(qd(api.repos.delete))),
      get: hw(nd(qd(api.repos.get))),
      list: hw(nd(qd(paginate(api.repos.list)))),
      listBranches: hw(nd(qd(api.repos.listBranches)))
    }
  };
};
