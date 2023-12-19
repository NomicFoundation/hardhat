# How to contribute to Ignition

This document contains some tips on how to collaborate in this project.

## Filing an issue

If you find a bug or want to propose a new feature, please open an issue. Pull requests are welcome, but we recommend you discuss it in an issue first, especially for big changes. This will increase the odds that we can accept your PR.

## Project Structure

This repository is a monorepo handled with `npm` workspaces.

There are five packages:

- [**core**](./packages/core/README.md) - containing the ignition library for orchestrating deployments
- [**hardhat-plugin**](./packages/hardhat-plugin/README.md) - containing the Hardhat plugin wrapper for the core library
- [**hardhat-plugin-ethers**](./packages/hardhat-plugin-ethers/README.md) - containing the Hardhat plugin extension to add ethers support to hardhat-plugin
- [**hardhat-plugin-viem**](./packages/hardhat-plugin-viem/README.md) - containing the Hardhat plugin extension to add viem support to hardhat-plugin
- [**ui**](./packages/ui/README.md) - containing the UI for the visualize report

## Setup

Ignition is a `typescript` project managed by `npm`.

To install the dependencies, run `npm` in the project root:

```shell
npm install
```

## Building

The packages are written in `typescript` and so require a build step, to build:

```shell
npm run build
```

The **Hardhat** plugin depends on **core**, while developing you may want to run a continuous build with `watch`:

```shell
npm run watch
```

## Testing

The test suite is written in `mocha`, to run:

```shell
npm run test
```

## Linting

Formatting is enforced with `prettier` and code rules with `eslint`, to run both:

```shell
npm run lint
```

## Clean

If typescript or testing gets into a weird state, `clean` will remove ephemeral folders (i.e. `./dist`, `./coverage` etc) and clear the typescript build info cache, allowing you to start from clean:

```shell
npm run clean
```

## Publish

To publish ignition:

1. git fetch, Checkout out `development`, then ensure your branch is up to date `git pull --ff-only`
2. Perform a clean install and build (will lose all uncommitted changes) git clean -fdx ., npm install, npm run build
3. Run a full check, stopping on failure: `npm run fullcheck`
4. Confirm the commits represent the features for the release
5. Create a release branch `git checkout -b release/yyyy-mm-dd`
6. Update the `CHANGELOG.md` under `./packages/core`.
7. Update the `CHANGELOG.md` under `./packages/hardhat-plugin`.
8. Update the `CHANGELOG.md` under `./packages/hardhat-plugin-ethers`.
9. Update the `CHANGELOG.md` under `./packages/hardhat-plugin-viem`.
10. Update the `CHANGELOG.md` under `./packages/ui`.
11. Update the package versions based on semver: `npm version --no-git-tag-version --workspaces patch #minor #major`
12. Update the version of dependencies:

- cores version in hardhat-ui deps
- cores and uis versions in hardhat-ignition devDeps and peerDeps
- examples version of hardhat-ignition

13. Commit the version update `git commit`:

```
chore: bump version to vX.X.X

Update the packages versions and changelogs for the `X.X.X -
yyyy-mm-dd` release.
```

14. Push the release branch and open a pull request on `main`, the PR description should match the changelogs
15. On a successful check, `rebase merge` the release branch into `main`
16. Switch to main branch and pull the latest changes
17. Git tag the version, `g tag -a v0.x.x -m "v0.x.x"` and push the tag `git push --follow-tags`
18. Publish `@nomicfoundation/ignition-core`, `@nomicfoundation/ignition-ui`, `@nomicfoundation/hardhat-ignition` and `@nomicfoundation/hardhat-ignition-viem` : `npm publish -w @nomicfoundation/ignition-core -w @nomicfoundation/ignition-ui -w @nomicfoundation/hardhat-ignition -w @nomicfoundation/hardhat-ignition-ethers -w @nomicfoundation/hardhat-ignition-viem`
19. Create a release on github off of the pushed tag

## Manual testing

> To knock off the rough edges

### Tests

---

#### **Try and deploy a module that doesn't exist**

---

##### <u>_Arrange_</u>

Setup ignition in a new hardhat project based on the getting started guide.

##### <u>_Act_</u>

Run a deploy with a module that doesn't exist

##### <u>_Assert_</u>

Check that a sensible error message is displayed

---

#### **Try and run a module with a validation error**

---

##### <u>_Arrange_</u>

Setup ignition in a new hardhat project based on the getting started guide.

Tweak the module so that it has a problem that will be caught by validation (ADD_MORE_DETAILS_HERE).

##### <u>_Act_</u>

Run a deploy with a invalid module

##### <u>_Assert_</u>

Check that a sensible error message is displayed

---

#### **Deploy to Sepolia testnet**

---

##### <u>_Arrange_</u>

Ensure you have an infura/alchemy RPC endpoint set up for Sepolia as well as an ETH address with Sepolia ETH that you don't mind pasting the privkey in plaintext for. I used metamask

Setup the network settings in the `hardhat.config.js` of the example you want to test

##### <u>_Act_</u>

Run a deploy/test from the example directory you set up

##### <u>_Assert_</u>

Check that deployment was successful, or results match expected (for instance, on-hold for multisig)
