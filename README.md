# Clean your useless GitHub forks

[![npm](https://img.shields.io/npm/v/remove-github-forks.svg)](https://www.npmjs.com/package/remove-github-forks)
[![npm](https://img.shields.io/npm/dt/remove-github-forks.svg)](https://www.npmjs.com/package/remove-github-forks)
[![Build Status](https://travis-ci.org/denis-sokolov/remove-github-forks.svg?branch=master)](https://travis-ci.org/denis-sokolov/remove-github-forks)
[![Code Climate](https://codeclimate.com/github/denis-sokolov/remove-github-forks/badges/gpa.svg)](https://codeclimate.com/github/denis-sokolov/remove-github-forks)
[![Codacy Badge](https://www.codacy.com/project/badge/8df79309ef6041f699f11a7ae6f36de2)](https://www.codacy.com/app/denis-sokolov/remove-github-forks)
[![bitHound Score](https://www.bithound.io/github/denis-sokolov/remove-github-forks/badges/score.svg?)](https://www.bithound.io/github/denis-sokolov/remove-github-forks)
[![Dependency Status](https://gemnasium.com/denis-sokolov/remove-github-forks.svg)](https://gemnasium.com/denis-sokolov/remove-github-forks)

Developers that contribute to many projects on GitHub, have their profiles full of meaningless temporary forks.
If a particular pull request has not been closed yet, keeping the fork is useful to modify that fork by pushing to the branch in question.
Once the pull request has been closed, though, there is hardly any value remaining in having the fork on one's profile.
This package will delete all forks on one's profile that have no unique commits.

## Usage

To allow the library access to a GitHub account, one needs an OAuth token.
[Create a new token](https://github.com/settings/tokens/new) with permissions `public_repo`, `delete_repo`. (include `repo` as well if you want to allow access to private repositories), and pass it to the library.

### Install

```
$ [sudo] npm install --global remove-github-forks
```

### Run

```
$ remove-github-forks token
? Will delete: user/repo, user/repo2 <yes|no>: yes
Done!
```

Warning! Your shell will likely store your command history in a plain-text file such as `.bash_history`. As a quick workaround, consider adding a space in front of your command for it to not be stored:

```
$ <space>remove-github-forks token
```

If you want to do this often and are happy with saving the token in plain-text, add an alias to your `.bashrc`:
```
alias clean-github='remove-github-forks YOUR-TOKEN'
```

#### Options

`--user <userOrOrganization>` will only clean repositories for the user or organization provided, without touching repositories for organizations you are in.

### API

Main usage to delete useless forks:

```javascript
var clean = require('remove-github-forks');
clean(token, function(err){});
```

Advanced usage:

```javascript
// Get a list of repositories that are useless
// repos is a list of {user, repo, url} objects
clean.get(token, function(err, repos){});

// Delete repositories
// repos is a list of {user, repo} objects
clean.remove(token, repos, function(err){});
```
