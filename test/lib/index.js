exports.USER = { login: 'current-user' }
exports.AUTHOR = { login: 'cool-author' }
exports.COMMIT_A = { sha: 'abcdef1' }
exports.COMMIT_B = { sha: 'abcdef2' }
exports.COMMIT_C = { sha: 'abcdef3' }

// No reason to believe JSON.stringify will order map properties in the same order
// This should be replaced with a custom function
var hash = function(r){
    return JSON.stringify(r);
}

var sortingFunction = function(a, b){
    return hash(a).localeCompare(hash(b))
}

var fail = function(t, msg, param){
    console.error(msg + ':', param)
    t.fail(msg)
}

exports.check = function(t, actual, expected){
    actual.sort(sortingFunction)
    expected.sort(sortingFunction)

    var failed = false

    /* eslint no-console: 0 */
    actual.forEach(function(actualRequest, i){
        if (failed) return

        if (expected.length < i + 1)
            return fail(t, 'Unexpected request found ' + JSON.stringify(actualRequest))

        if (hash(actualRequest) === hash(expected[i]))
            return

        failed = true

        // Fallback for older Node
        if (!Array.prototype.some)
            return fail(t, 'Incorrect request ' + JSON.stringify(actualRequest))

        var currentRequestIsExpectedButNotNow = expected.slice(i + 1).some(function(attempt){
            return hash(actualRequest) === hash(attempt);
        })
        if (currentRequestIsExpectedButNotNow)
            return fail(t, 'Missing request ' + JSON.stringify(expected[i]))

        fail(t, 'Unexpected request ' + JSON.stringify(actualRequest))
    })

    if (expected.length > actual.length)
        fail(t, 'Too few requests')
}

exports.mock = function(responses){
    responses.getAll = responses.getAll || [
        {name:'non-fork', fork: false},
        {name:'fork1', fork: true, owner: exports.USER }
    ]
    responses.get = responses.get || {
        name: 'fork1',
        owner: exports.USER, parent: { name: 'upstream-lib', owner: exports.AUTHOR }
    }

    var calls = []

    var buildResponder = function(name, responsePassed){
        return function(callData, cb){
            calls.push([name, callData])
            var response = {
              data: typeof responsePassed === 'function'
                ? responsePassed.call(null, callData)
                : responsePassed
            };
            return new Promise(function(resolve){
              setTimeout(function(){
                resolve(response)
                if (cb) cb(null, response)
              }, 0)
            })
        }
    }

    var buildRejecter = function(name){
      return function(){
        throw new Error('did not expect to have ' + name + ' called');
      };
    };

    var repos = {
      compareCommits: buildRejecter('compareCommits'),
      delete: buildRejecter('delete'),
      get: buildRejecter('get'),
      getAll: buildRejecter('getAll'),
      getBranches: buildRejecter('getBranches'),
    };
    Object.keys(responses).forEach(function(name){
        repos[name] = buildResponder(name, responses[name])
    })

    return {
        calls: function(){ return calls },
        present: { repos: repos }
    }
}
