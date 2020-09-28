# Clean your useless GitHub forks

[![npm](https://img.shields.io/npm/v/remove-github-forks.svg)](https://www.npmjs.com/package/remove-github-forks)
[![npm](https://img.shields.io/npm/dt/remove-github-forks.svg)](https://www.npmjs.com/package/remove-github-forks)
[![Build Status](https://travis-ci.org/denis-sokolov/remove-github-forks.svg?branch=master)](https://travis-ci.org/denis-sokolov/remove-github-forks)

If you contribute to many projects on GitHub, your profile is full of temporary forks that are only useful while the pull request is open. After that there is no reason to keep the fork. This tool will delete all such forks. And if there’s any commits in the fork that have not yet been merged upstream, the fork will be kept, of course. For the extra peace of mind, the tool will ask you to confirm the forks it plans to delete.

GitHub now suggests to delete the fork after deleting a PR branch, so this software is now less necessary. Still, depending on your workflow, you may benefit from mass-pruning of forks.

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

- `--debug` will output extended details in case of errors.
- `--user <userOrOrganization>` will only clean repositories for the user or organization provided, without touching repositories for organizations you are in.
- `-y`, `--yes` will not ask for confirmation before deleting repositories. Useful for cron jobs!

### API

Main usage to delete useless forks:

```javascript
var clean = require("remove-github-forks");
clean(token, function (err) {});
clean(
  token,
  {
    // If user is given, only forks belonging to this username
    // (or organization) will be deleted.
    user: "my-username",
  },
  function (err) {}
);
```

Advanced usage:

```javascript
// Get a list of repositories that are useless
// repos is a list of {user, repo, url} objects
clean.get(token, {
  // Trigger when we can estimate the amount of work done
  // info has fields:
  //   countInspected: number of inspected forks
  //   lastInspected: name of last inspected fork, can be empty at the start
  //   totalToInspect: total count of forks to inspect
  progress: function(info){}

  // If user is given, only forks belonging to this username
  // (or organization) will be returned.
  user: 'my-username',

  // If something in the process goes a little bit wrong in a non-destructive
  // way, we will skip the problematic item and continue. Use this callback
  // to know about such cases.
  warnings: function(msg, err){}
}, function(err, repos){});

// Delete repositories
// repos is a list of {user, repo} objects
clean.remove(token, repos, function(err){});
```

## Alternatives

I am not aware of many alternatives to this tool.

One is [github-clean-forks by caub](https://caub.github.io/github-clean-forks).

## Credits

Thanks for everyone who has contributed, and in particular @fregante for reinvigorating a paused project.
