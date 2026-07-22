#!/usr/bin/env bash

# Use node for file transforms to avoid BSD/GNU sed portability issues
node -e "
const fs = require('fs');

// Allow Verdaccio-published hardhat to satisfy the dependency. Since v1.7.0
// hardhat is also pinned via resolutions, which overrides the dependency range
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.devDependencies.hardhat = '^3.1.4';
if (pkg.resolutions !== undefined) {
  delete pkg.resolutions.hardhat;
}

// Since 3.4.0 hardhat requires viem ^2.47.6 (peer dependency): its revert
// errors carry JSON-RPC code 3, which older viem recognizes without preserving
// the original error, breaking the repo's revert-data assertions
pkg.devDependencies.viem = '2.47.6';
pkg.resolutions.viem = '2.47.6';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// Comment out generateTypedArtifacts — not a core Hardhat config option,
// it's an ENS-specific extension not available in the published hardhat version
let config = fs.readFileSync('hardhat.config.ts', 'utf8');
config = config.replace(
  /^( *)generateTypedArtifacts:[\s\S]*?^\1},/m,
  (match) => match.split('\n').map((line) => '// ' + line).join('\n')
);
fs.writeFileSync('hardhat.config.ts', config);
"

# Remove lockfile so bun resolves the latest from Verdaccio instead of the pinned version
rm -f bun.lock
