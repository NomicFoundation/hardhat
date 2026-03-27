#!/usr/bin/env bash

# Use node for file transforms to avoid BSD/GNU sed portability issues
node -e "
const fs = require('fs');

// Allow Verdaccio-published hardhat to satisfy the dependency
let pkg = fs.readFileSync('package.json', 'utf8');
pkg = pkg.replace('\"hardhat\": \"3.1.4\"', '\"hardhat\": \"^3.1.4\"');
fs.writeFileSync('package.json', pkg);

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
