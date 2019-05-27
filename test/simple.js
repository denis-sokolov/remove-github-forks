var test = require('ava')
var removeGithubForks = require('..')
var lib = require('./lib')

test.cb('should delete a fork with no branches', function(t){
    var mock = lib.mock({
        listBranches: [],
        'delete': true
    })

    removeGithubForks(mock.present, function(){
        lib.check(t, mock.calls(), [
          [ 'list', { per_page: 100, type: 'public' } ],
          [ 'get', { owner: lib.USER.login, repo: 'fork1' } ],
          [ 'listBranches', { owner: lib.USER.login, repo: 'fork1', per_page: 100 } ],
          [ 'listBranches', { owner: lib.AUTHOR.login, repo: 'upstream-lib', per_page: 100 } ],
          [ 'delete', { owner: lib.USER.login, repo: 'fork1', url: undefined } ]
        ])
        t.end()
    })
})

if (String.prototype.repeat)
    test.cb('should not delete a fork that has over 99 branches', function(t){
        var mock = lib.mock({
            listBranches: 'a'.repeat(99).split('a').map(function(a, i){ return 'branch' + i; })
        })

        removeGithubForks(mock.present, function(){
            lib.check(t, mock.calls(), [
              [ 'list', { per_page: 100, type: 'public' } ],
              [ 'get', { owner: lib.USER.login, repo: 'fork1' } ],
              [ 'listBranches', { owner: lib.USER.login, repo: 'fork1', per_page: 100 } ]
            ])
            t.end()
        })
    })

test.cb('should not delete a fork that has more branches', function(t){
    var mock = lib.mock({
        listBranches: function(args){
            if (args.owner === lib.USER.login)
                return ['foo'];
            return [];
        }
    })

    removeGithubForks(mock.present, function(){
        lib.check(t, mock.calls(), [
          [ 'list', { per_page: 100, type: 'public' } ],
          [ 'get', { owner: lib.USER.login, repo: 'fork1' } ],
          [ 'listBranches', { owner: lib.USER.login, repo: 'fork1', per_page: 100 } ],
          [ 'listBranches', { owner: lib.AUTHOR.login, repo: 'upstream-lib', per_page: 100 } ]
        ])
        t.end()
    })
})

// Currently our logic does not delete this fork
test.skip('should delete a fork that has more branches, but all at upstream branch tips', function(t){
    var mock = lib.mock({
        listBranches: function(args){
            if (args.user === lib.USER.login)
                return [
                    { name: 'master', commit: lib.COMMIT_A },
                    { name: 'foo', commit: lib.COMMIT_A },
                    { name: 'bar', commit: lib.COMMIT_B }
                ];
            return [
                  { name: 'master', commit: lib.COMMIT_A },
                  { name: 'baz', commit: lib.COMMIT_B }
            ];
        },
        delete: true
    })

    removeGithubForks(mock.present, function(){
        lib.check(t, mock.calls(), [
          [ 'list', { per_page: 100, type: 'public' } ],
          [ 'get', { owner: lib.USER.login, repo: 'fork1' } ],
          [ 'listBranches', { owner: lib.USER.login, repo: 'fork1', per_page: 100 } ],
          [ 'listBranches', { owner: lib.AUTHOR.login, repo: 'upstream-lib', per_page: 100 } ],
          [ 'delete', { owner: lib.USER.login, repo: 'fork1', url: undefined } ]
        ])
        t.end()
    })
})

test.cb('should delete a fork that has all branches at upstream branch tips', function(t){
    var mock = lib.mock({
        listBranches: function(args){
            if (args.user === lib.USER.login)
                return [
                    { name: 'master', commit: lib.COMMIT_A },
                    { name: 'foo', commit: lib.COMMIT_B }
                ];
            return [
                  { name: 'master', commit: lib.COMMIT_A },
                  { name: 'baz', commit: lib.COMMIT_B }
            ];
        },
        delete: true
    })

    removeGithubForks(mock.present, function(){
        lib.check(t, mock.calls(), [
          [ 'list', { per_page: 100, type: 'public' } ],
          [ 'get', { owner: lib.USER.login, repo: 'fork1' } ],
          [ 'listBranches', { owner: lib.USER.login, repo: 'fork1', per_page: 100 } ],
          [ 'listBranches', { owner: lib.AUTHOR.login, repo: 'upstream-lib', per_page: 100 } ],
          [ 'delete', { owner: lib.USER.login, repo: 'fork1', url: undefined } ]
        ])
        t.end()
    })
})

test.cb('should delete a fork that has branches behind', function(t){
    var mock = lib.mock({
        listBranches: function(args){
            if (args.owner === lib.USER.login)
                return [
                    { name: 'master', commit: lib.COMMIT_A },
                    { name: 'foo', commit: lib.COMMIT_B }
                ];
            return [
                { name: 'master', commit: lib.COMMIT_C },
                { name: 'foo', commit: lib.COMMIT_C }
            ];
        },
        compareCommits: { behind_by: 0 },
        delete: true
    })

    removeGithubForks(mock.present, function(){
        lib.check(t, mock.calls(), [
          [ 'list', { per_page: 100, type: 'public' } ],
          [ 'get', { owner: lib.USER.login, repo: 'fork1' } ],
          [ 'listBranches', { owner: lib.USER.login, repo: 'fork1', per_page: 100 } ],
          [ 'listBranches', { owner: lib.AUTHOR.login, repo: 'upstream-lib', per_page: 100 } ],
          [ 'compareCommits', { owner: lib.AUTHOR.login, repo: 'upstream-lib', base: lib.COMMIT_B.sha, head: 'master' } ],
          [ 'compareCommits', { owner: lib.AUTHOR.login, repo: 'upstream-lib', base: lib.COMMIT_B.sha, head: 'foo' } ],
          [ 'compareCommits', { owner: lib.AUTHOR.login, repo: 'upstream-lib', base: lib.COMMIT_A.sha, head: 'master' } ],
          [ 'delete', { owner: lib.USER.login, repo: 'fork1', url: undefined } ]
        ])
        t.end()
    })
})

test.cb('should not delete a fork that has diff that is too long to generate', function(t){
    var mock = lib.mock({
        listBranches: function(args){
            if (args.owner === lib.USER.login)
                return [
                    { name: 'master', commit: lib.COMMIT_A },
                ];
            return [
                { name: 'master', commit: lib.COMMIT_C },
            ];
        },
        compareCommits: function(){ throw new Error("this diff is taking too long to generate"); },
        delete: true
    })

    removeGithubForks(mock.present, function(){
        lib.check(t, mock.calls(), [
            [ 'list', { per_page: 100, type: 'public' } ],
            [ 'get', { owner: lib.USER.login, repo: 'fork1' } ],
            [ 'listBranches', { owner: lib.USER.login, repo: 'fork1', per_page: 100 } ],
            [ 'listBranches', { owner: lib.AUTHOR.login, repo: 'upstream-lib', per_page: 100 } ],
            [ 'compareCommits', { owner: lib.AUTHOR.login, repo: 'upstream-lib', base: lib.COMMIT_A.sha, head: 'master' } ],
        ])
        t.end()
    })
})

test.todo('compares branches with master in upstream')
test.todo('does not delete a fork that has branches ahead')
