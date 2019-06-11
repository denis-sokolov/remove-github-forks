"use strict";

var async = require("async");

var githubFactory = require("./githubFactory");
var shouldDeleteFork = require("./shouldDeleteFork");

var api = function(token, opts, cb) {
  if (!cb) {
    cb = opts;
    opts = {};
  }
  api.get(token, opts, function(err, repos) {
    if (err) return cb(err);
    api.remove(token, repos, cb);
  });
};

api.get = function(token, opts, getCb) {
  if (!getCb) {
    getCb = opts;
    opts = {};
  }
  opts.progress = opts.progress || function() {};
  opts.warnings = opts.warnings || function() {};

  var github = githubFactory(token);

  // Get all repositories
  github.repos
    .list({ per_page: 100, type: "public" })
    .then(function(repos) {
      // Keep only forks
      var forks = repos.filter(function(repo) {
        return repo.fork;
      });

      // Keep only forks owned by a specified user
      if (opts.user) {
        forks = forks.filter(function(repo) {
          return repo.owner.login === opts.user;
        });
      }

      var countDoneForks = 0;
      opts.progress({
        countInspected: 0,
        totalToInspect: forks.length
      });
      var forkDone = function(fork) {
        countDoneForks += 1;
        opts.progress({
          countInspected: countDoneForks,
          lastInspected: fork.name,
          totalToInspect: forks.length
        });
      };

      // Keep only useless forks
      async.filter(
        forks,
        function(fork, filterCb) {
          shouldDeleteFork(github, fork, function(err, result) {
            if (err) {
              opts.warnings(
                "Failed to inspect " + fork.name + ", skipping",
                err
              );
              result = false;
            }
            forkDone(fork);
            filterCb(null, result);
          });
        },
        function(error, forksToDelete) {
          if (error) return getCb(error);

          // Map to our simple objects
          var res = forksToDelete.map(function(fork) {
            return {
              owner: fork.owner.login,
              repo: fork.name,
              url: fork.html_url
            };
          });
          getCb(null, res);
        }
      );
    })
    .then(null, function(err) {
      getCb(err);
    });
};

api.remove = function(token, repos, removeCb) {
  var github = githubFactory(token);
  async.each(
    repos,
    function(repo, cb) {
      github.repos.delete({ owner: repo.owner, repo: repo.repo }, cb);
    },
    removeCb
  );
};

module.exports = api;
