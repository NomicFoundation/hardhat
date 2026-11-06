#!/usr/bin/env bash

# Use node for file transforms to avoid BSD/GNU sed portability issues
# (matches the convention used by the other scenarios' preinstall scripts).
node -e "
const fs = require('fs');

// Since 4.0.0 hardhat-toolbox-mocha-ethers requires hardhat-mocha ^4.0.0,
// which takes mocha ^12.0.0 as a peer dependency. The repo pins mocha ^11
// directly, so updating to the Verdaccio-published toolbox fails to resolve.
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.devDependencies?.mocha !== '^11.0.0') {
  console.error(
    'rocketpool preinstall: expected devDependencies.mocha to be ^11.0.0 — ' +
      'the pinned commit may have changed. Refusing to run against an ' +
      'unexpected mocha pin.',
  );
  process.exit(1);
}
pkg.devDependencies.mocha = '^12.0.0';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
