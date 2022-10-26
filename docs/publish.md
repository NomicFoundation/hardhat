# Publish Ignition

To publish ignition:

1. git fetch, Checkout out `main`, then ensure your branch is up to date `git pull --ff-only`
2. Run a full check, stopping on failure: `yarn fullcheck`
3. Under `./packages/core`, update the package version based on semver if appropriate.
4. Publish `core` if appropriate: `npm publish`
5. Under `./packages/hardhat-plugin`, update the package version based on semver if appropriate.
6. Publish `hardhat-plugin` if appropriate: `npm publish`
