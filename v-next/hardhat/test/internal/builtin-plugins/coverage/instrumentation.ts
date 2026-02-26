import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { latestSupportedSolidityVersion } from "@nomicfoundation/edr";

import { instrumentSolidityFileForCompilationJob } from "../../../../src/internal/builtin-plugins/coverage/instrumentation.js";

describe("Instrumentation version selection", () => {
  it("should should use the latesst supported Solidity version", async () => {
    const { instrumentationVersion } = instrumentSolidityFileForCompilationJob({
      sourceName: "Foo.sol",
      compilationJobSolcVersion: "100.0.0",
      coverageLibraryPath: "coverage.sol",
      fileContent: "",
    });

    assert.equal(instrumentationVersion, latestSupportedSolidityVersion());
  });

  it("should should use the selected Solidity version", async () => {
    const supportedVersion = "0.8.28";

    const { instrumentationVersion } = instrumentSolidityFileForCompilationJob({
      sourceName: "Foo.sol",
      compilationJobSolcVersion: supportedVersion,
      coverageLibraryPath: "coverage.sol",
      fileContent: "",
    });

    assert.equal(instrumentationVersion, supportedVersion);
  });
});
