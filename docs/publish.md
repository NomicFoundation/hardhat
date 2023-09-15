# Publish Ignition

To publish ignition:

1. git fetch, Checkout out `development`, then ensure your branch is up to date `git pull --ff-only`
2. Perform a clean install and build (will lose all uncommitted changes) git clean -fdx ., npm install, npm run build
3. Run a full check, stopping on failure: `npm run fullcheck`
4. Confirm the commits represent the features for the release
5. Create a release branch `git checkout -b release/yyyy-mm-dd`
6. Update the `CHANGELOG.md` under `./packages/core`.
7. Update the `CHANGELOG.md` under `./packages/hardhat-plugin`.
8. Update the `CHANGELOG.md` under `./packages/ui`.
9. Update the package versions based on semver: `npm version --no-git-tag-version --workspaces patch #minor #major`
10. Update the version of dependencies:

- cores version in hardhat-ui deps
- cores version in hardhat-ignition devDeps and peerDeps
- examples version of hardhat-ignition

11. Commit the version update `git commit`:

```
chore: bump version to vX.X.X

Update the packages versions and changelogs for the `X.X.X -
yyyy-mm-dd` release.
```

12. Push the release branch and open a pull request on `main`, the PR description should match the changelogs
13. On a successful check, `rebase merge` the release branch into `main`
14. Switch to main branch and pull the latest changes
15. Git tag the version, `g tag -a v0.x.x -m "v0.x.x"` and push the tag `git push --follow-tags`
16. Publish `@nomicfoundation/ignition-core`, `@nomicfoundation/ignition-ui` and `@nomicfoundation/hardhat-ignition` : `npm publish -w @nomicfoundation/ignition-core -w @nomicfoundation/ignition-ui -w @nomicfoundation/hardhat-ignition`
17. Create a release on github off of the pushed tag
