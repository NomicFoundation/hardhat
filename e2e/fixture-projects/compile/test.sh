#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should compile the contracts in the default project folder"
if ! npx hardhat compile >stdout 2>stderr; then
  print_error_msg "The command failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi

echo "it should fail the compilation in the 'fail-contracts' project folder"
if npx hardhat compile fail-contracts/Foo.sol >stdout 2>stderr; then
  print_error_msg "The command should have failed.\nOutput:'$(cat stdout)'\nError: '$(cat stderr)'"
  exit 1
fi
