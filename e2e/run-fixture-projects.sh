# !/usr/bin/env bash
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

HARDHAT_VERSION=$(echo $HARDHAT_TGZ_FILE | grep -oP 'hardhat-\K[0-9]+\.[0-9]+\.[0-9]+')

# create a temporary directory to run the tests
FIXTURE_PROJECTS_DIR=fixture-projects-run-$(date +%Y-%m-%d-%H-%M-%S)
cp -r fixture-projects $FIXTURE_PROJECTS_DIR

# run all the e2e tests in the temporary directory
echo "[e2e] Running tests in $FIXTURE_PROJECTS_DIR"
for dir in ${FIXTURE_PROJECTS_DIR}/*; do
  if [ -d "$dir" ]; then
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
  fi
done

# remove the temporary directory
rm -fr $FIXTURE_PROJECTS_DIR
