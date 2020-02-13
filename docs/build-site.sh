#!/usr/bin/env bash

set -x
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

npm install -g node-gyp-cache
npm config set node_gyp node-gyp-cache

cd ../
npm install
node scripts/install.js

cd "$DIR"
npm install
npm run apidocs
bash fix-api-docs.sh
npx ts-node build-plugins-doc.ts
bash wget-readmes.sh

bash error-list.sh
npm run build
bash error-list.sh
