#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should show the help information when no argument is passed"
if ! npx hardhat >stdout 2>stderr; then
  print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi

echo "it should show the help information when the 'help' argument is passed"
if ! npx hardhat help >stdout 2>stderr; then
  print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi
