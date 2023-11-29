#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

#
# test error when configuration variables are not set
#
echo "it should print an error saying that the configuration variable 'HH_E2E_TESTS_KEY_1' is not set"
expected_error_output="Cannot find a value for the configuration variable 'HH_E2E_TESTS_KEY_1'. Use 'npx hardhat vars set HH_E2E_TESTS_KEY_1' to set it or 'npx hardhat vars setup' to list all the configuration variables used by this project."
if ! npx hardhat 1>stdout 2>stderr; then
  # If the command failed, check if the error message contains the specific string
  if ! grep -q "$expected_error_output" stderr; then
    print_error_msg "The command failed successfully, but the error message was not the expected one"
    print_error_msg "The error should contains: '$expected_error_output', but got: '$(cat stderr)'"
    exit 1
  fi
else
  print_error_msg "It should fail because the configuration variable 'HH_E2E_TESTS_KEY_1' is not set. Got: '$(cat stdout)'"
  exit 1
fi

#
# Test that the configuration variables to set are shown correctly
#
echo "it should list the configuartion variables that need to be set"
if ! npx hardhat vars setup | diff - setup.txt; then
  print_error_msg "The 'vars setup' output does not match the expected one stored in the setup.txt file"
  exit 1
fi

#
# Test that the path to the configuration variables file is shown correctly
#
echo "it should show the path where the configuration variables are stored"
output=$(npx hardhat vars path)
expected_output="vars.json" # just check the final part of the path because unix path != windows path
if ! echo "$output" | grep -q "$expected_output"; then
  print_error_msg "The 'vars path' output is not the expected one. Got: '$output', but expected: '$expected_output'"
  exit 1
fi

#
# Test that variables can be set, retrieved, deleted, and listed
#
echo "it should perform the set, get, delete, and list operations correctly"
# set keys
npx hardhat vars set HH_E2E_TESTS_KEY_1 value_1 >/dev/null
npx hardhat vars set HH_E2E_TESTS_KEY_2 value_2 >/dev/null
npx hardhat vars set HH_E2E_TESTS_KEY_3 value_3 >/dev/null
npx hardhat vars set HH_E2E_TESTS_KEY_4 value_4 >/dev/null

# get keys
output=$(npx hardhat vars get HH_E2E_TESTS_KEY_1)
if [ "$output" != "value_1" ]; then
  print_error_msg "The value of HH_E2E_TESTS_KEY_1 should be 'value_1', but got: '$output'"
  exit 1
fi

# list keys
if ! npx hardhat vars list 2>stderr | diff - list.txt; then
  print_error_msg "The flatten file is different from the list.txt"
  exit 1
fi

# it should not fail becuase variables are set
npx hardhat >/dev/null

# delete keys
npx hardhat vars delete HH_E2E_TESTS_KEY_1 >/dev/null
npx hardhat vars delete HH_E2E_TESTS_KEY_2 >/dev/null
npx hardhat vars delete HH_E2E_TESTS_KEY_3 >/dev/null
npx hardhat vars delete HH_E2E_TESTS_KEY_4 >/dev/null

# list keys after deletion, there should be none
output=$(npx hardhat vars list)
if [ "$output" != "" ]; then
  print_error_msg "There should be no configuration variables stored but got output: '$output'"
  exit 1
fi
