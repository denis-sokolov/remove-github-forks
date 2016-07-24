var test = require('ava')
var removeGithubForks = require('..')
var lib = require('./lib')

test.cb('should not delete a fork if user option given', function(t){
    var mock = lib.mock({
        getBranches: [],
        'delete': true
    })

    removeGithubForks(mock.present, { user: 'john-snow' }, function(){
        lib.check(t, mock.calls(), [
          [ 'getAll', { per_page: 100, type: 'public' } ]
        ])
        t.end()
    })
})
