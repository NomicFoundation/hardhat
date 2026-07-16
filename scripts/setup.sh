#!/bin/bash
set -euo pipefail

sudo apt update

# libudev-dev is required by hardhat-ledger
sudo apt install -y libudev-dev

# Used for performance measurement
sudo apt install -y hyperfine

# Make sure bun is available at the cli
npm install -g bun
