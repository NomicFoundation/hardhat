#!/usr/bin/env bash

set -euo pipefail

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

// The 'with Beacon State verification enabled' tests read the current
// epoch, send a transaction (which mines a block at wall-clock time) and
// then read it again for the challenge start epoch. If a 384 s epoch
// boundary falls in between, the bitmap offset becomes -1 and the tests
// fail an assertion. Derive both values from the same read.
const testFile = 'test/tests/network/network-participation-minipool-tests.ts';
let test = fs.readFileSync(testFile, 'utf8');
for (const [from, to] of [
  [
    'const epoch = await currentEpoch(c) - (historical ? BigInt(PERIOD) : 4n);',
    'const now = await currentEpoch(c); const epoch = now - (historical ? BigInt(PERIOD) : 4n);',
  ],
  [
    'input[2] = bitmap(PERIOD, [...range(2642), Number(epoch - input[1])]);',
    'input[1] = now - BigInt(PERIOD); input[2] = bitmap(PERIOD, [...range(2642), Number(epoch - input[1])]);',
  ],
]) {
  if (test.split(from).length !== 2) {
    console.error('rocketpool preinstall: expected exactly one match in ' + testFile + ' for: ' + from);
    process.exit(1);
  }
  test = test.replace(from, to);
}
fs.writeFileSync(testFile, test);
"

# Run the benchmark on Amsterdam. Hardhat's default 60M block gas limit can't
# fit the upgrade contracts' Amsterdam (EIP-8037) code deposit and storage.
node -e "
const fs = require('fs');
const config = fs.readFileSync('hardhat.config.ts', 'utf8');
const anchor = /^( *)allowUnlimitedContractSize: true,$/m;
if (!anchor.test(config) || config.includes('blockGasLimit')) {
  console.error('rocketpool preinstall: expected one allowUnlimitedContractSize and no blockGasLimit in hardhat.config.ts');
  process.exit(1);
}
fs.writeFileSync(
  'hardhat.config.ts',
  config.replace(anchor, '\$&\n\$1blockGasLimit: 1_000_000_000,'),
);
"

# Amsterdam's state gas (EIP-8037) for the new storage slots of 32 exits
# exceeds the 12M budget of the max-size challenge tests. Raise it to 30M to
# record the Amsterdam gas they log.
node -e "
const fs = require('fs');
for (const [file, replacements] of [
  ['test/tests/network/network-participation-minipool-tests.ts', [
    'finaliseChallenge(id, { gasLimit: 12_000_000n })',
    'assert(result.gasUsed < 12_000_000n)',
  ]],
  ['test/tests/network/network-participation-tests.ts', [
    'finaliseList(current, c, c.validatorIds, 12_000_000n)',
    'assert(receipt.gasUsed < 12_000_000n)',
  ]],
]) {
  let test = fs.readFileSync(file, 'utf8');
  for (const from of replacements) {
    if (test.split(from).length !== 2) {
      console.error('rocketpool preinstall: expected exactly one match in ' + file + ' for: ' + from);
      process.exit(1);
    }
    test = test.replace(from, from.replace('12_000_000n', '30_000_000n'));
  }
  fs.writeFileSync(file, test);
}
"
