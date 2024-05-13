#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

pnpm madge $SCRIPT_DIR/../src/**/*.ts -i "$SCRIPT_DIR/../dependency-graph.png"
