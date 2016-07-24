var test = require('ava')
var removeGithubForks = require('..')
var lib = require('./lib')

test.cb('should not delete a fork if user option given', function(t){
    var mock = lib.mock({
        getBranches: [],
        'delete': true
    })

    var progressCallCount = 0

    removeGithubForks(mock.present, {
      progress: function(info){
        if (progressCallCount === 0) {
          t.is(info.countInspected, 0)
          t.is(info.totalToInspect, 1)
        } else {
          t.is(info.countInspected, 1)
          t.is(info.totalToInspect, 1)
          t.is(info.lastInspected, 'fork1')
          t.end()
        }
        progressCallCount += 1
      }
    }, function(){})
})
