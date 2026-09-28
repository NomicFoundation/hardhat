#!/bin/bash
set -euo pipefail

sudo apt update

# libudev-dev is required by hardhat-ledger
sudo apt install -y libudev-dev

# GNU time measures peak RSS for the benchmarks; bench:regression requires it
sudo apt install -y time

# Make sure bun is available at the cli
npm install -g bun
