import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import { buildDependencyGraph } from "../../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph-building.js";

describe("buildDependencyGraph", () => {
  useFixtureProject("solidity/example-project");

  it("should return an empty graph if no files are provided", async () => {
    const dependencyGraph = await buildDependencyGraph(
      [],
      process.cwd(),
      readUtf8File,
    );

    assert.equal(dependencyGraph.getRoots().size, 0);
    assert.equal(Array.from(dependencyGraph.getAllFiles()).length, 0);

    assert.equal(dependencyGraph.getAllRemappings().length, 0);
  });

  it("should build a graph from given files", async () => {
    const rootRelativePaths = [
      "contracts/A.sol",
      "contracts/D.sol",
      "contracts/NoImports.sol",
      "contracts/UserRemappedImport.sol",
    ];

    const rootInputSourceNames = rootRelativePaths.map((p) => `project/${p}`);

    const dependencyInputSourceNames = [
      "project/contracts/B.sol",
      "project/contracts/C.sol",
      "npm/@openzeppelin/contracts@5.1.0/access/Ownable.sol",
    ];

    const dependencyGraph = await buildDependencyGraph(
      rootRelativePaths.map((p) => path.join(process.cwd(), p)),
      process.cwd(),
      readUtf8File,
    );

    const roots = dependencyGraph.getRoots();
    assert.equal(
      roots.size,
      rootInputSourceNames.length,
      `Should have ${rootInputSourceNames.length} roots`,
    );
    for (const publicSourceName of rootRelativePaths) {
      assert.ok(
        roots.has(publicSourceName),
        `Should have root ${publicSourceName}`,
      );
    }

    const files = Array.from(dependencyGraph.getAllFiles()).map(
      (file) => file.inputSourceName,
    );
    assert.equal(files.length, 7, "Should have 7 files");
    for (const inputSourceName of rootInputSourceNames.concat(
      dependencyInputSourceNames,
    )) {
      assert.ok(
        files.includes(inputSourceName),
        `Should have file ${inputSourceName}`,
      );
    }

    const remappings = dependencyGraph.getAllRemappings();

    assert.equal(
      dependencyGraph.getAllRemappings().length,
      2,
      "Should have 2 remappings",
    );

    assert.ok(
      remappings.includes(
        "project/:remapped/=npm/@openzeppelin/contracts@5.1.0/access/",
      ),
      "Should have remapping for Ownable.sol",
    );
    assert.ok(
      remappings.includes(
        "project/:@openzeppelin/contracts/=npm/@openzeppelin/contracts@5.1.0/",
      ),
      "Should have remapping for @openzeppelin/contracts",
    );

    const expectedDependenciesJson: ReturnType<
      typeof dependencyGraph.toJSON
    >["dependencies"] = {
      "project/contracts/A.sol": {
        "project/contracts/B.sol": [],
      },
      "project/contracts/B.sol": {
        "npm/@openzeppelin/contracts@5.1.0/access/Ownable.sol": [
          "project/:@openzeppelin/contracts/=npm/@openzeppelin/contracts@5.1.0/",
        ],
      },
      "project/contracts/C.sol": {
        "project/contracts/B.sol": [],
      },
      "project/contracts/D.sol": {
        "project/contracts/C.sol": [],
      },
      "project/contracts/NoImports.sol": {},
      "project/contracts/UserRemappedImport.sol": {
        "npm/@openzeppelin/contracts@5.1.0/access/Ownable.sol": [
          "project/:remapped/=npm/@openzeppelin/contracts@5.1.0/access/",
        ],
      },
      "npm/@openzeppelin/contracts@5.1.0/access/Ownable.sol": {},
    };

    assert.deepEqual(
      dependencyGraph.toJSON().dependencies,
      expectedDependenciesJson,
    );
  });
});
