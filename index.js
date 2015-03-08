'use strict';

var async = require('async');
var githubLib = require('github');

var shouldDeleteFork = require('./shouldDeleteFork');

var githubFactory = function(token){
	var res = new githubLib({
		version: '3.0.0'
	});
	res.authenticate({
		type: 'oauth',
		token: token
	});
	return res;
};

var api = function(token, cb){
	api.get(token, function(err, repos){
		if (err) return cb(err);
		api.remove(token, repos, cb);
	});
};

api.get = function(token, cb){
	var github = githubFactory(token);
	async.waterfall([
		// Get all repositories
		function(cb){
			github.repos.getAll({ per_page : 100, type: "public"}, cb);
		},

		// Keep only forks
		function(repos, cb){
			var forks = repos.filter(function(repo){
				return repo.fork;
			});
			cb(null, forks);
		},

		// Keep only useless forks
		function(forks, cb){
			async.filter(forks, shouldDeleteFork(github), function(forksToDelete){
				cb(null, forksToDelete);
			});
		},

		// Map to our simple objects
		function(forks, cb){
			var res = forks.map(function(fork){
				return {
					user: fork.owner.login,
					repo: fork.name,
					url : fork.html_url
				};
			});
			cb(null, res);
		}
	], cb);
};

api.remove = function(token, repos, cb){
	var github = githubFactory(token);
	async.each(repos, function(repo, cb){
		github.repos['delete'](repo, cb);
	}, cb);
};

module.exports = api;
