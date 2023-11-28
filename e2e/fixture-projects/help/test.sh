#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

# replace the hardhat version in the files used to check that the output is correct because it changes in every release
sed -i "s/Hardhat version [0-9]*\.[0-9]*\.[0-9]*/Hardhat version $1/g" "help.txt"

echo "it should show the help information when no argument is passed"
if ! npx hardhat 2>stderr | diff - help.txt; then
  print_error_msg "The displayed help info does not match the expected ones in the file help.txt"
  exit 1
fi

echo "it should show the help information when the 'help' argument is passed"
if ! npx hardhat help 2>stderr | diff - help.txt; then
  print_error_msg "The displayed help info does not match the expected ones in the file help.txt"
  exit 1
fi
