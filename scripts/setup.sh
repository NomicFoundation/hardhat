#!/bin/bash
set -euo pipefail

sudo apt update

# libudev-dev is required by hardhat-ledger
sudo apt install -y libudev-dev

# aha and wkhtmltoimage are used in the integration tests of the node:test reporter
# We install wkhmtltopdf instead of wkhtmltoimage because:
# 1. Debian does not have the wkhtmltoimage package
# 2. wkhtmltopdf is a superset of wkhtmltoimage
sudo apt install -y aha wkhtmltopdf
