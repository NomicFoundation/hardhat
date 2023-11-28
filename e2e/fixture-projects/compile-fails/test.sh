#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

echo "it should fail the compilation"
if npx hardhat compile >stdout 2>stderr; then
  print_error_msg "Compilation should have failed"
  exit 1
fi

# assert that stderr had a HH600 error
grep -q "HH600: Compilation failed" stderr
