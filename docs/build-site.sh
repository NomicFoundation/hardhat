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

cp new_web/dist/index.html .vuepress/dist/
cp -r new_web/dist/assets/css .vuepress/dist/assets/
cp -r new_web/dist/assets/js .vuepress/dist/assets/
cp -r new_web/dist/assets/img .vuepress/dist/assets/
cp new_web/dist/*.svg .vuepress/dist/