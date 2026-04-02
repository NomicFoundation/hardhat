#!/bin/bash
set -euo pipefail

sudo apt update

# libudev-dev is required by hardhat-ledger
sudo apt install -y libudev-dev

# aha and wkhtmltoimage (included in the wkhtmltopdf package) are used in the integration tests of the node:test reporter
sudo apt install -y aha

curl -sL https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb -o /tmp/wkhtmltox.deb
sudo apt install -y /tmp/wkhtmltox.deb
rm /tmp/wkhtmltox.deb

# Used for performance measurement
sudo apt install -y hyperfine

# Make sure bun is available at the cli
npm install -g bun
