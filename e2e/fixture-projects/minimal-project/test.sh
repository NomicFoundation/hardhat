#! /usr/bin/env sh
# fail if any commands fails
set -e

npx hardhat compile
npx hardhat test
