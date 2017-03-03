var GithubLib = require('github')
var queue = require('queue')

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

module.exports = function (token) {
  var api = rawGithubFactory(token)

  var q = queue({
    concurrency: 1,
    timeout: 2000
  })

  // Transform a github function call into a queued function call
  // to ensure that only one API call runs at a time
  // https://developer.github.com/guides/best-practices-for-integrators/#dealing-with-abuse-rate-limits
  var qd = function(call){
    if (typeof call !== 'function')
      throw new Error('call should be a function: ' + call);
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

  var makeResponseTransformer = function(transform){
    return function(call){
      if (typeof call !== 'function')
        throw new Error('call should be a function: ' + call);
      return function(){
        var args = [].slice.apply(arguments)
        var argsCb = args.pop()
        if (typeof argsCb !== 'function') {
          args.push(argsCb)
          argsCb = null
        }
        return call.apply(null, args).then(function(result){
          result = transform(result)
          if (argsCb) argsCb(null, result)
          return result
        }, function onRejected(err){
          if (argsCb) {
            argsCb(err);
          }
        })
      }
    }
  }

  // Unwrap .data in the response
  var nd = makeResponseTransformer(function(response){
    return response.data;
  });

  return {
    repos: {
      compareCommits: nd(qd(api.repos.compareCommits)),
      delete: nd(qd(api.repos.delete)),
      get: nd(qd(api.repos.get)),
      getAll: nd(qd(api.repos.getAll)),
      getBranches: nd(qd(api.repos.getBranches))
    }
  }
}
