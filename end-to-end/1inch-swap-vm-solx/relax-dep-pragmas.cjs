// Prime-step helper (copied into the workdir by preinstall.sh): the repo's
// @1inch npm dependencies pin `pragma solidity 0.8.30;` exactly, which rejects
// the benchmark's solc 0.8.34 on both tools. Relax them like preinstall does
// for the repo's own sources. This cannot run in preinstall itself —
// node_modules only exists after the harness installs — so it runs as the
// first prime step instead.
"use strict";

const fs = require("fs");
const path = require("path");

const FROM = "pragma solidity 0.8.30;";
const TO = "pragma solidity ^0.8.30;";

let patched = 0;
let alreadyRelaxed = 0;

for (const pkg of [
  "node_modules/@1inch/aqua",
  "node_modules/@1inch/solidity-utils",
]) {
  // Resolve the pnpm symlink: walking the virtual-store path directly keeps
  // the edit scoped to this project's copy.
  const root = fs.realpathSync(pkg);
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") {
          walk(entryPath);
        }
      } else if (entry.name.endsWith(".sol")) {
        const source = fs.readFileSync(entryPath, "utf8");
        if (source.includes(FROM)) {
          // rm before writing: pnpm hardlinks package files into its global
          // content-addressable store, and an in-place truncate would rewrite
          // the shared store copy for every other install on this runner.
          fs.rmSync(entryPath);
          fs.writeFileSync(entryPath, source.replaceAll(FROM, TO));
          patched++;
        } else if (source.includes(TO)) {
          alreadyRelaxed++;
        }
      }
    }
  })(root);
}

if (patched === 0) {
  if (alreadyRelaxed > 0) {
    // Reused workdir: a previous invocation already relaxed the tree.
    console.log(
      `relax-dep-pragmas: ${alreadyRelaxed} dependency files already relaxed`,
    );
    process.exit(0);
  }
  console.error(
    "relax-dep-pragmas: no `" +
      FROM +
      "` pragmas found in the @1inch dependencies — the pinned commit's " +
      "dependency set may have changed. Refusing to benchmark an unexpected tree.",
  );
  process.exit(1);
}

console.log(`relax-dep-pragmas: relaxed ${patched} dependency files`);
