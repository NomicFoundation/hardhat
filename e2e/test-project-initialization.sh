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

# create a temporary directory to run the tests
TESTS_DIR=projects-initialization-tests-$(date +%Y-%m-%d-%H-%M-%S)
mkdir $TESTS_DIR

# npm, javascript, cjs
mkdir ${TESTS_DIR}/npm-javascript-cjs
cd ${TESTS_DIR}/npm-javascript-cjs
npm init -y
npm install ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
HARDHAT_CREATE_JAVASCRIPT_PROJECT_WITH_DEFAULTS=true npx hardhat init
npx hardhat compile
npx hardhat test
cd -

# npm, javascript, esm
mkdir ${TESTS_DIR}/npm-javascript-esm
cd ${TESTS_DIR}/npm-javascript-esm
npm init -y
jq '. += {"type": "module"}' package.json > esm-package.json
mv esm-package.json package.json
npm install ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
HARDHAT_CREATE_JAVASCRIPT_PROJECT_WITH_DEFAULTS=true npx hardhat init
npx hardhat compile
npx hardhat test
cd -

# npm, typescript, esm
mkdir ${TESTS_DIR}/npm-javascript-esm
cd ${TESTS_DIR}/npm-javascript-esm
npm init -y
jq '. += {"type": "module"}' package.json > esm-package.json
mv esm-package.json package.json
npm install ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
if HARDHAT_CREATE_TYPESCRIPT_PROJECT_WITH_DEFAULTS=true npx hardhat init; then
  echo "Initialization should have failed"
  exit 1
else
  echo "Initialization failed as expected"
fi
cd -

# remove the temporary directory
rm -fr $TESTS_DIR
