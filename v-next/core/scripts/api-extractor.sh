#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )


cat <<EOF > "$SCRIPT_DIR/../src/api-extractor-entrypoint.ts"
export * from "./index.js";
export type * from "./index.js";

export * from "./config.js";
export type * from "./config.js";

export * from "./types/cli.js";
export type * from "./types/cli.js";
export * from "./types/common.js";
export type * from "./types/common.js";
export * from "./types/config.js";
export type * from "./types/config.js";
export * from "./types/global-parameters.js";
export type * from "./types/global-parameters.js";
export * from "./types/hooks.js";
export type * from "./types/hooks.js";
export * from "./types/hre.js";
export type * from "./types/hre.js";
export * from "./types/plugins.js";
export type * from "./types/plugins.js";
export * from "./types/tasks.js";
export type * from "./types/tasks.js";
export * from "./types/user-interruptions.js";
export type * from "./types/user-interruptions.js";
export * from "./types/utils.js";
export type * from "./types/utils.js";
EOF


pnpm tsc || (rm "$SCRIPT_DIR/../src/api-extractor-entrypoint.ts"; exit 1)
pnpm api-extractor run --config "$SCRIPT_DIR/api-extractor.json" || (rm "$SCRIPT_DIR/../src/api-extractor-entrypoint.ts"; exit 1)
rm "$SCRIPT_DIR/../src/api-extractor-entrypoint.ts" || exit 1
rm -rf "$SCRIPT_DIR/../temp" || exit 1

RED=$(tput setaf 1)
NORMAL=$(tput sgr0)
grep --fixed-string '/// <reference types="node" />' --silent "$SCRIPT_DIR/../dist/extracted-api.d.ts" && printf "\n\n\n${RED}WARNING: node types are part of the API!!!${NORMAL}\n\n\n" && exit 1
