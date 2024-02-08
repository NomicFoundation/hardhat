#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should run the gas reporter while running the tests"
export "REPORT_GAS='true'"
run_test_and_handle_failure "npx hardhat test" 0
