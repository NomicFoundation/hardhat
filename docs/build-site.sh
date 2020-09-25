#!/usr/bin/env bash

set -x
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

yarn global add node-gyp-cache
yarn config set node_gyp node-gyp-cache

cd ../
yarn

cd "$DIR"
yarn
yarn apidocs
bash fix-api-docs.sh
npx ts-node build-plugins-doc.ts
bash wget-readmes.sh

bash error-list.sh
yarn build
bash error-list.sh
