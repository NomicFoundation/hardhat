#!/usr/bin/env node

import { printNodeJsVersionWarningIfNecessary } from "./internal/cli/node-version.js";

// We enable the sourcemaps before loading main, so that everything except this
// small file is loaded with sourcemaps enabled.
process.setSourceMapsEnabled(true);

// We also print this warning before loading main, so that if there is some
// unsupported js syntax or Node API elsewhere, we get to print it before
// crashing.
printNodeJsVersionWarningIfNecessary();

// eslint-disable-next-line no-restricted-syntax -- Allow top-level await here
const { main } = await import("./internal/cli/main.js");

main(process.argv.slice(2), { registerTsx: true }).catch(() => {
  process.exitCode = 1;
});
