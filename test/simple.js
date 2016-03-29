var test = require('ava')
var removeGithubForks = require('..')

var USER = { login: 'current-user' }
var AUTHOR = { login: 'cool-author' }

var makeMock = function(responses){
    var calls = []

    var buildResponder = function(name, response){
        return function(callData, cb){
            calls.push([name, callData])
            if (typeof response === 'function')
                response = response.apply(null, callData)
            cb(null, response)
        }
    }

    var repos = {}
    Object.keys(responses).forEach(function(name){
        repos[name] = buildResponder(name, responses[name])
    })

    return {
        calls: function(){ return calls },
        present: { repos: repos }
    }
}

test.cb('should run a simple case', function(t){
    var mock = makeMock({
        getAll: [
            {name:'non-fork', fork: false},
            {name:'fork1', fork: true, owner: USER }
        ],
        get: {
            name: 'fork1',
            owner: USER, parent: { name: 'upstream-lib', owner: AUTHOR }
        },
        getBranches: [],
        'delete': true
    })

    removeGithubForks(mock.present, function(){
        t.same(mock.calls(), [
          [ 'getAll', { per_page: 100, type: 'public' } ],
          [ 'get', { user: 'current-user', repo: 'fork1' } ],
          [ 'getBranches', { user: 'current-user', repo: 'fork1', per_page: 100 } ],
          [ 'getBranches', { user: 'cool-author', repo: 'upstream-lib', per_page: 100 } ],
          [ 'delete', { user: 'current-user', repo: 'fork1', url: undefined } ]
        ])
        t.end()
    })
})
