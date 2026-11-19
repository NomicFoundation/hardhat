#!/usr/bin/env bash

# Use node for file transforms to avoid BSD/GNU sed portability issues
node -e "
const fs = require('fs');

// Allow Verdaccio-published hardhat to satisfy the dependency
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.devDependencies ??= {};
pkg.devDependencies.hardhat = '^3.9.0';

// Pin ethers tree-wide to the repo's exact version. The lockfile removal below
// otherwise gives hardhat-ethers (ethers: ^6.14.0) a newer nested copy than the
// repo's pin, and two ethers classes break the test helpers' \`instanceof
// EventLog\` checks (findEvents in lib/event.ts finds no events).
const ethersVersion = pkg.dependencies?.ethers ?? pkg.devDependencies?.ethers;
if (ethersVersion === undefined) {
  console.error(
    'lidofinance-core preinstall: expected an ethers pin in package.json — ' +
      'the pinned commit may have changed. Refusing to run without a ' +
      'tree-wide ethers resolution.',
  );
  process.exit(1);
}
pkg.resolutions = { ...pkg.resolutions, ethers: ethersVersion };

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Remove lockfile so yarn resolves the latest from Verdaccio instead of the pinned version
rm -f yarn.lock

# Run the benchmark on Amsterdam: the repo pins its networks to Prague. Its
# 30M block gas limit can't fit its contracts' Amsterdam (EIP-8037) code deposit.
node -e "
const fs = require('fs');
let config = fs.readFileSync('hardhat.config.ts', 'utf8');
for (const [pin, to] of [
  [/hardfork: \"prague\"/g, 'hardfork: \"amsterdam\"'],
  [/blockGasLimit: 30000000,/g, 'blockGasLimit: 1_000_000_000,'],
]) {
  if (!pin.test(config)) {
    console.error('lidofinance-core preinstall: no match in hardhat.config.ts for ' + pin);
    process.exit(1);
  }
  config = config.replace(pin, to);
}
fs.writeFileSync('hardhat.config.ts', config);
"
