#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

run_test_and_handle_failure "npx hardhat compile" 0

echo "assert that the artifacts and cache directory exist and are not empty"
assert_directory_exists "artifacts"
assert_directory_not_empty "artifacts"
assert_directory_exists "cache"
assert_directory_not_empty "cache"

echo "it should run the command clean successfully"
run_test_and_handle_failure "npx hardhat clean" 0

echo "it should have deleted the artifacts directory and emptied the cache directory"
assert_directory_does_not_exist "artifacts"
assert_directory_exists "cache"
assert_directory_empty "cache"
