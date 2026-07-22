#!/usr/bin/env bash

# Use node for file transforms to avoid BSD/GNU sed portability issues
node -e "
const fs = require('fs');

// Allow Verdaccio-published hardhat to satisfy the dependency
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.devDependencies.hardhat = '^3.9.0';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Remove lockfile so yarn resolves the latest from Verdaccio instead of the pinned version
rm -f yarn.lock
