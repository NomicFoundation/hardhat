#!/bin/bash
set -euo pipefail

sudo apt update

# TODO: nodejs, npm, yarn
# libudev-dev is required by hardhat-ledger
sudo apt install -y libudev-dev
