#! /usr/bin/env sh

# fail if any commands fails
set -e

# import helpers functions
. ../../helpers.sh

echo "Running tests: $(basename "$(pwd)")"

# replace the hardhat version in the files used to check that the output is correct because it changes in every release
sed -i "s/hardhat v[0-9]*\.[0-9]*\.[0-9]*/hardhat v$1/g" "flatten_all_files.txt"
sed -i "s/hardhat v[0-9]*\.[0-9]*\.[0-9]*/hardhat v$1/g" "flatten_lock_file.txt"

echo "it should flatten all the files in the folder because no file names are passed"
if ! npx hardhat flatten 2>stderr | diff - flatten_all_files.txt; then
  print_error_msg "The flatten file is different from the flatten_all_files.txt"
  exit 1
fi

echo "it should flatten only the 'Lock.sol' file because it is passed as an argument"
if ! npx hardhat flatten contracts/Lock.sol 2>stderr | diff - flatten_lock_file.txt; then
  print_error_msg "The flatten file is different from the flatten_lock_file.txt"
  exit 1
fi
