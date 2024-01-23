#!/usr/bin/env bash
# fail if any commands fails
set -e

# Use this function because yarn init -y throws a warning, and the whole script will fail
# because of "set -e"
create_package_json() {
  cat >package.json <<EOF
{
  "name": "tmp",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "description": ""
}
EOF
}

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

echo "[e2e] Starting e2e initialization tests in $TESTS_DIR\n\n"

pkg_managers="npm pnpm yarn"

# log version of each package manager
echo "[e2e] Package managers versions:"
for pkg_manager in $pkg_managers; do
  echo "[e2e] $pkg_manager version: $($pkg_manager --version)"
done

for pkg_manager in $pkg_managers; do
  echo "\n\n[e2e] Running tests with package manager: $pkg_manager"

  # pkg_manager, javascript, cjs
  echo "[e2e] Testing: $pkg_manager, javascript, cjs"
  mkdir ${TESTS_DIR}/${pkg_manager}-javascript-cjs
  cd ${TESTS_DIR}/${pkg_manager}-javascript-cjs
  create_package_json
  $pkg_manager add ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
  HARDHAT_CREATE_JAVASCRIPT_PROJECT_WITH_DEFAULTS=true npx hardhat init
  npx hardhat compile
  npx hardhat test
  cd -

  # pkg_manager, javascript, esm
  echo "[e2e] Testing: $pkg_manager, javascript, esm"
  mkdir ${TESTS_DIR}/${pkg_manager}-javascript-esm
  cd ${TESTS_DIR}/${pkg_manager}-javascript-esm
  create_package_json
  jq '. += {"type": "module"}' package.json >esm-package.json
  mv esm-package.json package.json
  $pkg_manager add ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
  HARDHAT_CREATE_JAVASCRIPT_PROJECT_WITH_DEFAULTS=true npx hardhat init
  npx hardhat compile
  npx hardhat test
  cd -

  # pkg_manager, typescript, cjs
  echo "[e2e] Testing: $pkg_manager, typescript, cjs"
  mkdir ${TESTS_DIR}/${pkg_manager}-typescript-cjs
  cd ${TESTS_DIR}/${pkg_manager}-typescript-cjs
  create_package_json
  $pkg_manager add ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
  HARDHAT_CREATE_TYPESCRIPT_PROJECT_WITH_DEFAULTS=true npx hardhat init
  npx hardhat compile
  npx hardhat test
  cd -

  # pkg_manager, typescript, esm
  echo "[e2e] Testing: $pkg_manager, typescript, esm"
  mkdir ${TESTS_DIR}/${pkg_manager}-typescript-esm
  cd ${TESTS_DIR}/${pkg_manager}-typescript-esm
  create_package_json
  jq '. += {"type": "module"}' package.json >esm-package.json
  mv esm-package.json package.json
  $pkg_manager add ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
  if HARDHAT_CREATE_TYPESCRIPT_PROJECT_WITH_DEFAULTS=true npx hardhat init; then
    echo "[e2e] Initialization should have failed"
    exit 1
  else
    echo "[e2e] Initialization failed as expected"
  fi
  cd -

  # pkg_manager, typescript-viem, cjs
  echo "[e2e] Testing: $pkg_manager, typescript-viem, cjs"
  mkdir ${TESTS_DIR}/${pkg_manager}-typescript-viem-cjs
  cd ${TESTS_DIR}/${pkg_manager}-typescript-viem-cjs
  create_package_json
  $pkg_manager add ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
  HARDHAT_CREATE_TYPESCRIPT_VIEM_PROJECT_WITH_DEFAULTS=true npx hardhat init
  npx hardhat compile
  npx hardhat test
  cd -

  # pkg_manager, typescript-viem, esm
  echo "[e2e] Testing: $pkg_manager, typescript-viem, esm"
  mkdir ${TESTS_DIR}/${pkg_manager}-typescript-viem-esm
  cd ${TESTS_DIR}/${pkg_manager}-typescript-viem-esm
  create_package_json
  jq '. += {"type": "module"}' package.json >esm-package.json
  mv esm-package.json package.json
  $pkg_manager add ../../../packages/hardhat-core/$HARDHAT_TGZ_FILE >/dev/null 2>&1
  if HARDHAT_CREATE_TYPESCRIPT_VIEM_PROJECT_WITH_DEFAULTS=true npx hardhat init; then
    echo "[e2e] Initialization should have failed"
    exit 1
  else
    echo "[e2e] Initialization failed as expected"
  fi
  cd -

done

echo "\n[e2e] All tests passed\n"

# remove the temporary directory
rm -fr $TESTS_DIR
