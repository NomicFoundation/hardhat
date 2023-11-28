#! /usr/bin/env sh

# fail if any commands fails
set -e

echo "Running tests: $(basename "$(pwd)")"

echo "it should compile and run the tests in the project folder"
npx hardhat compile >stdout 2>stderr
npx hardhat test >stdout 2>stderr
