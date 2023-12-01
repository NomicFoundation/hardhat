#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should run the tests in the project folder"
if ! npx hardhat test >stdout 2>stderr; then
  print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi
