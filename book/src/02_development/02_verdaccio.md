# Verdaccio

[Verdaccio](https://verdaccio.org/) is a private npm registry that can be used locally. 
It’s useful to test things related to publishing without actually publishing, or to just test changes in a more realistic way than linking a package but with less friction than packing a `.tar.gz` and installing it.

## Installation

`npm i -g verdaccio` 

## Usage

1. In one terminal, run `verdaccio`
2. In another terminal login with `pnpm login --registry=http://localhost:4873/`. Any user and password will do.
3. Publish your package by passing the verdaccio registry as a parameter: `pnpm publish --registry=http://localhost:4873/`.
4. Go to the project where you want to test and install the package with `npm i your-package --registry=http://localhost:4873/`.

> Note: Read [Local Release](./03_local_release.md) on special instructions for publishing EDR NPM packages using Verdaccio.

## Updating a package

If after publishing to `verdaccio` you want to make some changes and try them, you’ll have to publish the package with a new version and then run `npm i your-package@latest --registry=http://localhost:4873/` in the test project.

# Resetting Verdaccio

1. Stop the `verdaccio` server
2. Delete the `verdaccio` storage directory which is `~/.local/share/verdaccio/storage` by default on UNIX platforms.
