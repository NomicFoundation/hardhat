#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should flatten all the files in the folder because no file names are passed"
if ! npx hardhat flatten >stdout 2>stderr; then
  print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi

echo "it should flatten only the 'Lock.sol' file because it is passed as an argument"
if ! npx hardhat flatten contracts/Lock.sol >stdout 2>stderr; then
  print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi
