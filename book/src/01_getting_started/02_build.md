# Build

EDR exists in a mono-repo, together with Hardhat.
Moreover, it's EDR is a dependency for Hardhat, so in order to build Hardhat with EDR its build process has been combined.

To get started, install all dependencies in the root directory:

```bash
yarn
```

Then navigate to the Hardhat Core directory and build Hardhat with EDR:

```bash
cd packages/hardhat-core &&
yarn build
```
