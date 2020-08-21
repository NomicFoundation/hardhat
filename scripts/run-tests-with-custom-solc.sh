#!/usr/bin/env sh

set -e

if [ -z "${BUIDLER_TESTS_SOLC_PATH}" ] || [ -z "${BUIDLER_TESTS_SOLC_VERSION}" ]; then
  echo "You have to set the BUIDLER_TESTS_SOLC_PATH and BUIDLER_TESTS_SOLC_VERSION environment variables"
  exit 1
fi

# go to the root of the project
cd "$(git rev-parse --show-toplevel)"

# install dependencies
npm install

# run buidler-core tests
cd packages/buidler-core
npm test
