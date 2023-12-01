#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should print an error saying that the configuration variables are not set"
if npx hardhat >stdout 2>stderr; then
  print_error_msg "The command should have failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi

echo "it should list the configuartion variables that need to be set"
if ! npx hardhat vars setup >stdout 2>stderr; then
  print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi

echo "it should show the path where the configuration variables are stored"
if ! npx hardhat vars path >stdout 2>stderr; then
  print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi

echo "it should list the keys without failing (even if there are no keys)"
if ! npx hardhat vars list >stdout 2>stderr; then
  print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi

echo "it should fail becuase the key does not exist"
# random key to be sure that it does not exist if this test is ran locally
if npx hardhat vars get HH_KEY_DO_NOT_EXIST_3468267 >stdout 2>stderr; then
  print_error_msg "The command should have failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi

#
# Do not DELETE or SET keys to avoid modifing the configuration variables of the user running these tests
#
