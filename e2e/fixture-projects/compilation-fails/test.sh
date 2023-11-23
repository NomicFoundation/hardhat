#! /usr/bin/env sh
# fail if any commands fails
set -e

# expect compilation to fail
if npx hardhat compile > stdout 2> stderr; then
  echo "Compilation should have failed"
  exit 1
else
  echo "Compilation failed as expected"
fi

# assert that stderr had a HH600 error
grep -q "HH600: Compilation failed" stderr
