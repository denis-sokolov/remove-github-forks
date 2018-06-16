#!/usr/bin/env node
/* eslint no-console: 0, no-process-exit: 0 */
'use strict'

var program = require('commander')
var confirm = require('confirm-simple')
var singleLineLog = require('single-line-log').stdout;

var clean = require('./index')
var meta = require('../package.json')

program
  .version(meta.version)
  .usage('token')
  .option('--user <value>', 'Only cleanup given user or organization')
  .option('-p, --page <value>', 'Page of repos to fetch', 1)
  .option('-y, --yes', 'Do not ask for confirmation')
  .parse(process.argv)

program.on('--help', function () {
  console.log('  Please get the OAuth token:')
  console.log('')
  console.log('  Head to https://github.com/settings/tokens/new')
  console.log('  Create a token with permissions public_repo, delete_repo')
  console.log('  Pass that in the CLI, enjoy!')
  console.log('')
})

if (program.args.length !== 1) program.help()

var token = program.args[0]

var abort = function (err) {
  console.error(err.message || err)
  process.exit(1)
}

var assureConfirmation = function(repos, cb){
  if (program.yes) return cb();
  confirm(
    'Delete these forks: \n' + repos.map(function (repo) {
      return '    ' + repo.url
  }).join('\n') + '\n', function(confirmed){
    if (!confirmed) {
      return abort('Aborting.')
    }
    cb();
  });
};

clean.get(token, {
  progress: function(info){
    singleLineLog(
      'Inspected ' + info.countInspected
      + '/' + info.totalToInspect
      + (info.lastInspected ? ' (' + info.lastInspected + ')' : '')
      + '\n'
    )
  },
  user: program.user,
  page: program.page,
  warnings: function(msg, err){
   console.error(msg, err);
  }
}, function (err, repos) {
  if (err) return abort(err)

  if (!repos.length) {
    console.log('No useless repositories found.')
    process.exit(0)
  }

  assureConfirmation(repos, function() {
    clean.remove(token, repos, function (errDeleting) {
      if (errDeleting) return abort(errDeleting)
      console.log('Done!')
      process.exit(0)
    })
  })
})
