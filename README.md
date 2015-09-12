# Clean your useless GitHub forks

[![Code Climate](https://codeclimate.com/github/denis-sokolov/remove-github-forks/badges/gpa.svg)](https://codeclimate.com/github/denis-sokolov/remove-github-forks)
[![Codacy Badge](https://www.codacy.com/project/badge/8df79309ef6041f699f11a7ae6f36de2)](https://www.codacy.com/app/denis-sokolov/remove-github-forks)
[![bitHound Score](https://www.bithound.io/github/denis-sokolov/remove-github-forks/badges/score.svg?)](https://www.bithound.io/github/denis-sokolov/remove-github-forks)
[![Dependency Status](https://gemnasium.com/denis-sokolov/remove-github-forks.svg)](https://gemnasium.com/denis-sokolov/remove-github-forks)
[![js-strict-standard-style](https://img.shields.io/badge/code%20style-strict%20standard-117D6B.svg)](https://github.com/denis-sokolov/strict-standard)

Developers that contribute to many projects on GitHub, have their profiles full of meaningless temporary forks.
If a particular pull request has not been closed yet, keeping the fork is useful to modify that fork by pushing to the branch in question.
Once the pull request has been closed, though, there is hardly any value remaining in having the fork on one's profile.
This package will delete all forks on one's profile that have no unique commits.

## Usage

To allow the library access to a GitHub account, one needs an OAuth token.
[Create a new token](https://github.com/settings/tokens/new) with permissions `public_repo`, `delete_repo`. (Use `repo` to allow access for private repositories), and pass it to the library.

### Install

```
$ npm install --global remove-github-forks
```

### Command line

```
$ remove-github-forks token
? Will delete: user/repo, user/repo2 <yes|no>: yes
Done!
```

If you want to do this often and are happy with saving the token in plain-text, add an alias to your `.bashrc`:
```
alias clean-github='remove-github-forks YOUR-TOKEN'
```

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
