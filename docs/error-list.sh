#!/usr/bin/env bash

set -x
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

mkdir -p errors
npx ts-node build-error-list.ts > errors/README.md
mkdir -p .vuepress/dist

npx ts-node build-error-redirects.ts > .vuepress/dist/_redirects
cat _redirects >> .vuepress/dist/_redirects 
