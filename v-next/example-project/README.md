# Hardhat example project

This is an example hardhat v3 project, which you can use to experiment with the developnment version.

To use it you have to `cd` into this folder and run:

```sh
pnpm install
pnpm build
pnpm hardhat
```

You can set and read configuration variables in a local keystore with:

```sh
# Set a value for reading in Hardhat.config.{js,ts}
pnpm hardhat keystore set mykey

# Print a value from the keystore
pnpm hardhat keystore get mykey
```
