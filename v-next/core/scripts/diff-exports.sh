#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

shopt -s globstar

ACTUAL=$(cat "${SCRIPT_DIR}/../package.json" | jq -r ".exports[]" | sed "s/\.\/dist\///" | sort)
EXPECTED=$(ls src/*.ts src/types/**/*.ts | sort  | sed "s/\.ts/\.js/")

diff --color -u <(echo "$EXPECTED") <(echo "$ACTUAL")
