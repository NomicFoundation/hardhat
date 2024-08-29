#!/bin/bash
set -euo pipefail

sudo apt update

# libudev-dev is required by hardhat-ledger
sudo apt install -y libudev-dev

# aha and wkhtmltoimage are used in the integration tests of the node:test reporter
sudo apt install -y aha wkhtmltoimage
