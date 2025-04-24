import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import { buildDependencyGraph } from "../../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph-building.js";

describe("buildDependencyGraph", () => {
  useFixtureProject("solidity/example-project");

  it("should return an empty graph if no files are provided", async () => {
    const { dependencyGraph, resolver } = await buildDependencyGraph(
      [],
      process.cwd(),
      [],
      readUtf8File,
    );

    assert.equal(dependencyGraph.getRoots().size, 0);
    assert.equal(Array.from(dependencyGraph.getAllFiles()).length, 0);

    assert.equal(resolver.getRemappings().length, 0);
  });

  it("should build a graph from given files", async () => {
    const rootSourceNames = [
      "contracts/A.sol",
      "contracts/D.sol",
      "contracts/NoImports.sol",
      "contracts/UserRemappedImport.sol",
    ];
    const dependencySourceNames = [
      "contracts/B.sol",
      "contracts/C.sol",
      "npm/@openzeppelin/contracts@5.1.0/access/Ownable.sol",
    ];

    const { dependencyGraph, resolver } = await buildDependencyGraph(
      rootSourceNames.map((sourceName) => path.join(process.cwd(), sourceName)),
      process.cwd(),
      ["remapped/=npm/@openzeppelin/contracts@5.1.0/access/"],
      readUtf8File,
    );

    const roots = dependencyGraph.getRoots();
    assert.equal(
      roots.size,
      rootSourceNames.length,
      `Should have ${rootSourceNames.length} roots`,
    );
    for (const sourceName of rootSourceNames) {
      assert.ok(roots.has(sourceName), `Should have root ${sourceName}`);
    }

    const files = Array.from(dependencyGraph.getAllFiles()).map(
      (file) => file.sourceName,
    );
    assert.equal(files.length, 7, "Should have 7 files");
    for (const sourceName of rootSourceNames.concat(dependencySourceNames)) {
      assert.ok(files.includes(sourceName), `Should have file ${sourceName}`);
    }

    const remappings = resolver.getRemappings();
    assert.equal(remappings.length, 2, "Should have 2 remappings");
    assert.ok(
      remappings.some(
        (r) =>
          r.context === "" &&
          r.prefix === "remapped/" &&
          r.target === "npm/@openzeppelin/contracts@5.1.0/access/",
      ),
      "Should have remapping for Ownable.sol",
    );
    assert.ok(
      remappings.some(
        (r) =>
          r.context === "" &&
          r.prefix === "@openzeppelin/contracts/" &&
          r.target === "npm/@openzeppelin/contracts@5.1.0/",
      ),
      "Should have remapping for @openzeppelin/contracts",
    );
  });
});
