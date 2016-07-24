'use strict'

var async = require('async')
var GithubLib = require('github')
var Promise = require('promise')
var queue = require('queue')

var shouldDeleteFork = require('./shouldDeleteFork')

var rawGithubFactory = function (token) {
  // Allow to inject a GitHub API instead of a token
  if (token.repos) {
    return token
  }

  var res = new GithubLib({
    version: '3.0.0'
  })
  res.authenticate({
    type: 'oauth',
    token: token
  })
  return res
}

var githubFactory = function (token) {
  var api = rawGithubFactory(token)

  var q = queue({
    concurrency: 1,
    timeout: 2000
  })

  // Transform a github function call into a queued function call
  // to ensure that only one API call runs at a time
  // https://developer.github.com/guides/best-practices-for-integrators/#dealing-with-abuse-rate-limits
  var qd = function(call){
    return function(){
      var args = [].slice.apply(arguments)
      return new Promise(function(resolve, reject){
        q.push(function(cb){
          var argsCb = args.pop()
          if (typeof argsCb !== 'function') {
            args.push(argsCb)
            argsCb = null
          }
          call.apply(null, args).then(function(result){
            cb()
            if (argsCb) argsCb(null, result)
            resolve(result)
          }, function(error){
            cb()
            if (argsCb) argsCb(error)
            reject(error)
          })
        })
        q.start()
      })
    }
  }

  return {
    repos: {
      compareCommits: qd(api.repos.compareCommits),
      delete: qd(api.repos.delete),
      get: qd(api.repos.get),
      getAll: qd(api.repos.getAll),
      getBranches: qd(api.repos.getBranches)
    }
  }
}

var api = function (token, cb) {
  api.get(token, function (err, repos) {
    if (err) return cb(err)
    api.remove(token, repos, cb)
  })
}

api.get = function (token, getCb) {
  var github = githubFactory(token)

  // Get all repositories
  github.repos.getAll({ per_page: 100, type: 'public' }).then(function(repos){
    // Keep only forks
    var forks = repos.filter(function (repo) {
      return repo.fork
    })

    // Keep only useless forks
    async.filter(forks, shouldDeleteFork(github), function (forksToDelete) {
      // Map to our simple objects
      var res = forksToDelete.map(function (fork) {
        return {
          user: fork.owner.login,
          repo: fork.name,
          url: fork.html_url
        }
      })
      getCb(null, res)
    })
  }).then(null, function(err){ getCb(err) })
}

api.remove = function (token, repos, removeCb) {
  var github = githubFactory(token)
  async.each(repos, function (repo, cb) {
    github.repos.delete(repo, cb)
  }, removeCb)
}

module.exports = api
