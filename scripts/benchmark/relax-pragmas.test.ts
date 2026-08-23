// Unit tests for the preinstall pragma walker.
//
// Every solx scenario whose pin uses exact pragmas runs this before the
// benchmark builds, so a walker that quietly does the wrong thing (relaxing
// a tree a --skip flag was supposed to protect) reaches the timed cells as a
// different source graph, not as an error.
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

import { relaxPragmas } from "./relax-pragmas.ts";

const tempDirs: string[] = [];

after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeTree(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "relax-pragmas-"));
  tempDirs.push(root);
  for (const [relativePath, content] of Object.entries(files)) {
    const full = path.join(root, relativePath);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

function source(version: string): string {
  return `// SPDX-License-Identifier: MIT\npragma solidity ${version};\n`;
}

function read(root: string, relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

const OPTIONS = {
  scenario: "test-solx",
  from: "0.8.25",
  skipDirs: [],
  skipPaths: [],
};

describe("relaxPragmas", () => {
  it("relaxes the exact pragma everywhere it walks", () => {
    const root = makeTree({
      "contracts/A.sol": source("0.8.25"),
      "contracts/nested/B.sol": source("0.8.25"),
      "contracts/C.sol": source("^0.8.20"),
      "contracts/notes.txt": source("0.8.25"),
    });

    assert.equal(relaxPragmas(root, OPTIONS), 2);
    assert.match(read(root, "contracts/A.sol"), /pragma solidity \^0\.8\.25;/);
    assert.match(
      read(root, "contracts/nested/B.sol"),
      /pragma solidity \^0\.8\.25;/,
    );
    assert.equal(read(root, "contracts/C.sol"), source("^0.8.20"));
    assert.equal(read(root, "contracts/notes.txt"), source("0.8.25"));
  });

  it("leaves the skipped dir and path alone", () => {
    const root = makeTree({
      "contracts/A.sol": source("0.8.25"),
      "lib/forge-std/Vm.sol": source("0.8.25"),
      "contracts/upgrade/Vote.sol": source("0.8.25"),
    });

    assert.equal(
      relaxPragmas(root, {
        ...OPTIONS,
        skipDirs: ["lib"],
        skipPaths: ["contracts/upgrade"],
      }),
      1,
    );
    assert.match(read(root, "contracts/A.sol"), /pragma solidity \^0\.8\.25;/);
    assert.equal(read(root, "lib/forge-std/Vm.sol"), source("0.8.25"));
    assert.equal(read(root, "contracts/upgrade/Vote.sol"), source("0.8.25"));
  });

  it("throws when a --skip-dir matched nothing", () => {
    const root = makeTree({ "contracts/A.sol": source("0.8.25") });

    assert.throws(
      () => relaxPragmas(root, { ...OPTIONS, skipDirs: ["libs"] }),
      /--skip-dir libs/,
    );
  });

  it("throws when a --skip-path matched nothing", () => {
    const root = makeTree({
      "contracts/A.sol": source("0.8.25"),
      "contracts/upgrade/Vote.sol": source("0.8.25"),
    });

    assert.throws(
      () =>
        relaxPragmas(root, {
          ...OPTIONS,
          skipPaths: ["contracts/upgraded"],
        }),
      /--skip-path contracts\/upgraded/,
    );
  });

  it("throws when nothing was patched", () => {
    const root = makeTree({ "contracts/A.sol": source("^0.8.20") });

    assert.throws(
      () => relaxPragmas(root, OPTIONS),
      /no `pragma solidity 0\.8\.25;` pragmas found/,
    );
  });
});
