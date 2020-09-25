var test = require('ava')
var removeGithubForks = require('..')
var lib = require('./lib')

test.cb('should not delete a fork if user option given', function(t){
    var mock = lib.mock({
        listBranches: [],
        'delete': true
    })

    removeGithubForks(mock.present, { user: 'john-snow' }, function(){
        lib.check(t, mock.calls(), [
          [ 'listForAuthenticatedUser', { type: 'public' } ]
        ])
        t.end()
    })
})
