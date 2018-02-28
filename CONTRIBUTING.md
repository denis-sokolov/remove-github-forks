# IMPORTANT

When filing an issue, **DO NOT** paste your token along with the command you executed (and the results).

For example, you would change:

```
$ remove-github-forks a4df6099f47ca53f583baedc358389369f49589a
Inspected 36/63 (chai)
(node:5109) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): {"message":"No common ancestor between cd70c88c6516ad5e04ce17ab7db4b1df2b728b50 and master.","documentation_url":"https://developer.github.com/v3/repos/commits/#compare-two-commits"}
(node:5109) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
{"message":"Server Error: Sorry, this diff is taking too long to generate.","errors":[{"resource":"Comparison","field":"diff","code":"not_available"}],"documentation_url":"https://developer.github.com/v3/repos/commits/#compare-two-commits"}
```

To this:

```
$ remove-github-forks TOKEN
Inspected 36/63 (chai)
(node:5109) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): {"message":"No common ancestor between cd70c88c6516ad5e04ce17ab7db4b1df2b728b50 and master.","documentation_url":"https://developer.github.com/v3/repos/commits/#compare-two-commits"}
(node:5109) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
{"message":"Server Error: Sorry, this diff is taking too long to generate.","errors":[{"resource":"Comparison","field":"diff","code":"not_available"}],"documentation_url":"https://developer.github.com/v3/repos/commits/#compare-two-commits"}
```

Your token provides access to your account and thus could be abused if made public. If you did provide your token, you should [revoke it](https://github.com/settings/tokens) immediately. We do not accept responsibility for any damage caused by you piblishing your access token in this repo.
