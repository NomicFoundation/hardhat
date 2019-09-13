#!/usr/bin/env bash

set -x
set -e

npm install --no-package-lock
npx lerna bootstrap --no-package-lock --no-ci

# We delete these .bin folders because lerna creates them and then npm doesn't link the packages
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/.."
rm -rf packages/*/node_modules/.bin
