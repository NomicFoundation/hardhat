#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd ../
npm install
npx lerna bootstrap

cd "$DIR"
npm install
npm run apidocs
bash fix-api-docs.sh
npm run build
