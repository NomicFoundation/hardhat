#!/usr/bin/env bash

set -x
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd "$DIR"
yarn --frozen-lockfile
yarn ts-node get-plugins-downloads.ts

bash error-list.sh
yarn build
bash error-list.sh

cat _headers >> .vuepress/dist/_headers

if [ "$CONTEXT" = "branch-deploy"  ]; then 
  bash prevent-indexing.sh 
fi
