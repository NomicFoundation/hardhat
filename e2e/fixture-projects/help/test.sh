#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should show the help information when no argument is passed"
run_test_and_handle_failure "npx hardhat" 0

echo "it should show the help information when the 'help' argument is passed"
run_test_and_handle_failure "npx hardhat help" 0
