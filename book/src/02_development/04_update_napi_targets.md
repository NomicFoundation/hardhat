First, install `@napi-rs/cli`:

```bash
npm -g i @napi-rs/cli
```

Then follow the steps in [this document](https://napi.rs/docs/introduction/simple-package) to generate a package with the desired supported target triples.

You will be prompted for several inputs.
Use the package name `@nomicfoundation/edr` and select the desired target triples.

Once done, replace the `napi.triples.additional` entries in `crates/edr_napi/package.json` with the values in the generated `package.json` and replace `crates/edr_napi/npm` with the generated `npm` folder.

Ensure that the `version` field of all `npm/*/package.json` files is set to the latest release and `engines.node` to the minimum supported version.

Finally, to update the `index.js`, run:

```bash
cd crates/edr_napi &&
pnpm build
```
