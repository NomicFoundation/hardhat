# Publish Ignition

To publish ignition:

1. git fetch, Checkout out `main`, then ensure your branch is up to date `git pull --ff-only`
2. Run a full check, stopping on failure: `npm run fullcheck`
3. Create a release branch `git checkout -b release/yyyy-mm-dd`
4. Under `./packages/core`, update the package version based on semver if appropriate.
5. Under `./packages/hardhat-plugin`, update the package version based on semver if appropriate.
6. Update dependency package versions in examples to match
7. Update the `CHANGELOG.md` under `./packages/core`.
8. Update the `CHANGELOG.md` under `./packages/hardhat-plugin`.
9. Commit the version update `git commit`:

```
chore: bump version to vX.X.X

Update the packages versions and changelogs for the `X.X.X -
yyyy-mm-dd` release.
```

10. Push the release branch and open a pull request, the PR description should match the changelogs
11. On a successful check, `rebase merge` the release branch into main
12. Switch to main branch and pull the latest changes
13. Git tag the version, `g tag -a v0.x.x -m "v0.x.x"` and push the tag `git push --follow-tags`
14. Publish `core` if appropriate: `npm publish`
15. Publish `hardhat-plugin` if appropriate: `npm publish`
16. Create a release on github off of the pushed tag
