#!/usr/bin/env bash

# Allow Verdaccio-published hardhat to satisfy the dependency
sed -i 's/"hardhat": "3.1.4"/"hardhat": "^3.1.4"/' package.json

# Remove lockfile so bun resolves the latest from Verdaccio instead of the pinned version
rm -f bun.lock

# Comment out generateTypedArtifacts — not a core Hardhat config option,
# it's an ENS-specific extension not available in the published hardhat version
sed -i '/generateTypedArtifacts/,/^  },/s/^/  \/\/ /' hardhat.config.ts