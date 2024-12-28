#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should print an error saying that the configuration variables are not set"
run_test_and_handle_failure "npx hardhat" 1

echo "it should list the configuration variables that need to be set"
run_test_and_handle_failure "npx hardhat vars setup" 0

echo "it should list the keys without failing (even if there are no keys)"
run_test_and_handle_failure "npx hardhat vars list" 0

echo "it should fail because the key does not exist"
# random key to be sure that it does not exist if this test is ran locally
run_test_and_handle_failure "npx hardhat vars get HH_KEY_DO_NOT_EXIST_3468267" 1

#
# Do not DELETE or SET keys to avoid modifing the configuration variables of the user running these tests
#
