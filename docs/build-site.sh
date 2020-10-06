#!/usr/bin/env bash

set -x
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd "$DIR"
yarn
yarn ts-node build-plugins-doc.ts
bash wget-readmes.sh

bash error-list.sh
yarn build
bash error-list.sh

if [ "$CONTEXT" = "branch-deploy"  ]; then 
  bash prevent-indexing.sh 
fi
