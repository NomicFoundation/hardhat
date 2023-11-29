# !/usr/bin/env bash

#
# NOTE: you can pass the name of a single fixture-projects folder to this script to execute a single test project.
# E.g.: ./run-fixture-projects.sh vars
#

# fail if any commands fails
set -e

# build hardhat-core
echo "[e2e] Building and packing hardhat-core"
cd ../packages/hardhat-core
pnpm install
pnpm build
HARDHAT_TGZ_FILE=$(pnpm pack)
echo "[e2e] Built $HARDHAT_TGZ_FILE"
cd - >/dev/null

HARDHAT_VERSION=$(echo $HARDHAT_TGZ_FILE | grep -o -E 'hardhat-[0-9]+\.[0-9]+\.[0-9]+' | sed 's/hardhat-//')

# create a temporary directory to run the tests
FIXTURE_PROJECTS_DIR=fixture-projects-run-$(date +%Y-%m-%d-%H-%M-%S)
cp -r fixture-projects $FIXTURE_PROJECTS_DIR

# run all the e2e tests in the temporary directory
echo "[e2e] Running tests in $FIXTURE_PROJECTS_DIR\n\n"

for dir in ${FIXTURE_PROJECTS_DIR}/*; do
  if [ -d "$dir" ]; then

    if [ -n "$1" ] && [ "$(basename "$dir")" != "$1" ]; then
      # only execute the tests for the project passed as argument to this script, if any
      continue
    fi

    echo "[e2e] Running tests in $dir"
    cd "$dir"

    echo "[e2e] Insatlling modules in $dir"
    npm add ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
    echo "[e2e] All modules have been insatlled in $dir"

    echo "[e2e] Starting test in $dir"
    # The parameter HARDHAT_VERSION could be used in tests where the output shows the Hardhat version.
    # E.g.: in the flatten task
    ./test.sh $HARDHAT_VERSION
    cd -

    echo "[e2e] Finished test in $dir\n\n"
  fi
done

echo "\n[e2e] All tests passed\n"

# remove the temporary directory
rm -fr $FIXTURE_PROJECTS_DIR
