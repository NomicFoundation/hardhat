foo#!/usr/bin/env sh

set -e

if [ -z "${HARDHAT_TESTS_SOLC_PATH}" ] || [ -z "${HARDHAT_TESTS_SOLC_VERSION}" ]; then
  echo "You have to set the HARDHAT_TESTS_SOLC_PATH and HARDHAT_TESTS_SOLC_VERSION environment variables"
  exit 1
fi

# go to the root of the project
cd "$(git rev-parse --show-toplevel)"

# install dependencies
pnpm install

# run hardhat tests
cd packages/hardhat-core
pnpm test
