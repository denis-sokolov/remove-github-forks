'use strict'

var async = require('async')

var branchIsUseful = function (github, repo, branch, parentBranches, cb) {
  var someParentBranchAtThisSha = parentBranches.filter(function (candidate) {
    return branch.commit.sha === candidate.commit.sha
  }).length === 1

  if (someParentBranchAtThisSha) {
    return cb(null, false)
  }

  // Check if at least one parent branch contains this commit
  // Looping through all parent branches is immensely slow,
  // let's take a safe shortcut
  var branchesToCheck = parentBranches.filter(function (b) {
    return [branch.name, 'master'].indexOf(b.name) > -1
  })
  async.some(branchesToCheck, function (candidate, someCb) {
    github.repos.compareCommits({
      owner: repo.parent.owner.login,
      repo: repo.parent.name,
      base: branch.commit.sha,
      head: candidate.name
    }, function (err, diff) {
      if (err) {
        // If diff can't be found, means our commit is not on this
        // parent branch candidate
        if (err.code === 404) {
          return someCb(null, false)
        }
        return someCb(err)
      }

      // If parent is not behind us, this parent candidate
      // branch contains our branch
      someCb(null, !diff.behind_by)
    })
  }, function (err, parentContainsOurCommit) {
    if (err) cb(err)
    else cb(null, !parentContainsOurCommit)
  })
}

module.exports = function (github, fork, shouldDeleteCb) {
  async.waterfall([
    // Grab the repository information
    function (cb) {
      github.repos.get({owner: fork.owner.login, repo: fork.name}, cb)
    },

    // Grab all branches
    function (repo, cb) {
      github.repos.listBranches({
        owner: repo.owner.login,
        repo: repo.name,
        per_page: 100
      }, function (err, branches) {
        if (err) return cb(err)

        if (branches.length === 100) {
          // There are too many branches,
          // dealing with pagination is not supported
          shouldDeleteCb(null, false)
          return
        }

        cb(null, repo, branches)
      })
    },

    // Grap all parent repository branches
    function (repo, branches, cb) {
      github.repos.listBranches({
        owner: repo.parent.owner.login,
        repo: repo.parent.name,
        per_page: 100
      }, function (err, parentbranches) {
        cb(err, repo, branches, parentbranches)
      })
    },

    // Compare if for each local branch is useless
    function (repo, branches, parentbranches, cb) {
      // Quick common case
      if (branches.length > parentbranches.length) {
        cb(null, true)
        return
      }

      async.some(branches, function (branch, someCb) {
        branchIsUseful(github, repo, branch, parentbranches, function (err, useful) {
          if (err) return someCb(err)
          someCb(null, useful)
        })
      }, cb)
    }
  ], function (err, someBranchesUseful) {
    if (err) shouldDeleteCb(err)
    else shouldDeleteCb(null, !someBranchesUseful)
  })
}
