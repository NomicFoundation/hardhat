#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should run a script that uses the hardhat network provider"
run_test_and_handle_failure "npx hardhat run script.js" 0
