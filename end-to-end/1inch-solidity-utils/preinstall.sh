#!/usr/bin/env bash

# Use node for file transforms to avoid BSD/GNU sed portability issues
# (matches the convention used by the other scenarios' preinstall scripts).
node -e "
const fs = require('fs');

// Since 4.0.0 hardhat-toolbox-mocha-ethers and hardhat-mocha take mocha
// ^12.0.0 as a peer dependency. The repo pins mocha 11.8.0, which yarn only
// warns about, so the Verdaccio-published toolbox would run against an
// unsupported mocha.
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.dependencies?.mocha !== '11.8.0') {
  console.error(
    '1inch-solidity-utils preinstall: expected dependencies.mocha to be ' +
      '11.8.0 — the pinned commit may have changed. Refusing to run against ' +
      'an unexpected mocha pin.',
  );
  process.exit(1);
}
pkg.dependencies.mocha = '^12.0.0';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
