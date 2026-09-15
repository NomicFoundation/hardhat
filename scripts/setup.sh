#!/bin/bash
set -euo pipefail

sudo apt update

# libudev-dev is required by hardhat-ledger
sudo apt install -y libudev-dev


# Make sure bun is available at the cli
npm install -g bun
