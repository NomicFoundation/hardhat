import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import { CoverageManagerImplementation } from "../../../../../src/internal/builtin-plugins/coverage/coverage-manager.js";
import { getCoverageManager } from "../../../../../src/internal/builtin-plugins/coverage/helpers/accessors.js";

describe("coverage/hook-handlers/solidity — skipFiles", () => {
  const SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract C {
  function f(uint256 n) public pure returns (uint256) {
    if (n == 0) {
      return 0;
    }
    return n;
  }
}
`;

  const SOLC_VERSION = "0.8.28";

  async function preprocess(
    hre: Awaited<ReturnType<typeof createHardhatRuntimeEnvironment>>,
    sourceName: string,
    fsPath: string,
  ): Promise<string> {
    return await hre.hooks.runHandlerChain(
      "solidity",
      "preprocessProjectFileBeforeBuilding",
      [sourceName, fsPath, SOURCE, SOLC_VERSION],
      async (_context, _sourceName, _fsPath, fileContent) => fileContent,
    );
  }

  it("does not instrument a file whose source name matches a skipFiles glob", async () => {
    const hre = await createHardhatRuntimeEnvironment(
      { coverage: { skipFiles: ["**/mocks/**"] } },
      { coverage: true },
    );
    const coverageManager = getCoverageManagerImpl(hre);

    const fsPath = path.join(
      hre.config.paths.root,
      "contracts",
      "mocks",
      "Mock.sol",
    );

    const result = await preprocess(
      hre,
      "project/contracts/mocks/Mock.sol",
      fsPath,
    );

    // Skipped files are passed through unchanged and produce no metadata.
    assert.equal(result, SOURCE);
    assert.equal(
      coverageManager.filesMetadata.has(
        path.join("contracts", "mocks", "Mock.sol"),
      ),
      false,
    );
  });

  it("instruments a file whose source name does not match any skipFiles glob", async () => {
    const hre = await createHardhatRuntimeEnvironment(
      { coverage: { skipFiles: ["**/mocks/**"] } },
      { coverage: true },
    );
    const coverageManager = getCoverageManagerImpl(hre);

    const fsPath = path.join(hre.config.paths.root, "contracts", "Token.sol");

    const result = await preprocess(hre, "project/contracts/Token.sol", fsPath);

    // Non-skipped files are instrumented and produce metadata.
    assert.notEqual(result, SOURCE);
    assert.equal(
      coverageManager.filesMetadata.has(path.join("contracts", "Token.sol")),
      true,
    );
  });
});

function getCoverageManagerImpl(
  hre: Awaited<ReturnType<typeof createHardhatRuntimeEnvironment>>,
): CoverageManagerImplementation {
  const coverageManager = getCoverageManager(hre);

  assert.ok(
    coverageManager instanceof CoverageManagerImplementation,
    "expected a CoverageManagerImplementation",
  );

  return coverageManager;
}
