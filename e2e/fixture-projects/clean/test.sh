#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

npx hardhat clean >stdout 2>stderr

# the folder "artifacts" should not exist
if [ -d "artifacts" ]; then
  print_error_msg "The directory 'artifacts' should not exist"
  exit 1
fi

# the folder "cache" should be empty
if [ -d "cache" ] && [ -n "$(ls -A cache)" ]; then
  print_error_msg "ERROR: The directory 'cache' is not empty."
  exit 1
fi
