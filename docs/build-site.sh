#!/usr/bin/env bash

npm install
npm run apidocs
bash fix-api-docs.sh
npm run build