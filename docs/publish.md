# Publish Ignition

To publish ignition:

1. git fetch, Checkout out `main`, then ensure your branch is up to date `git pull --ff-only`
2. Run a full check, stopping on failure: `npm run fullcheck`
3. Create a release branch `git checkout -b release/yyyy-mm-dd`
4. Update the `CHANGELOG.md` under `./packages/core`.
5. Update the `CHANGELOG.md` under `./packages/hardhat-plugin`.
6. Update the package versions based on semver: `npm version --no-git-tag-version --workspaces patch #minor #major`
7. Update the version of dependencies:

- cores version in hardhat-ignition devDeps and peerDeps
- examples version of hardhat-ignition

8. Commit the version update `git commit`:

```
chore: bump version to vX.X.X

Update the packages versions and changelogs for the `X.X.X -
yyyy-mm-dd` release.
```

9. Push the release branch and open a pull request, the PR description should match the changelogs
10. On a successful check, `rebase merge` the release branch into main
11. Switch to main branch and pull the latest changes
12. Git tag the version, `g tag -a v0.x.x -m "v0.x.x"` and push the tag `git push --follow-tags`
13. Publish `core` if appropriate: `npm publish`
14. Publish `hardhat-plugin` if appropriate: `npm publish`
15. Create a release on github off of the pushed tag
