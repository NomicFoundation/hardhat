import type { FlattenActionArguments } from "../../../../src/internal/builtin-plugins/flatten/task-action.js";

import assert from "node:assert/strict";
import fs from "node:fs";
import { beforeEach, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import flattenAction from "../../../../src/internal/builtin-plugins/flatten/task-action.js";
import { getHardhatVersion } from "../../../../src/internal/utils/package.js";

// Helpers to capture the console output
const consoleLogBuffer: string[] = [];
const consoleWarnBuffer: string[] = [];

const getConsoleLogOutput = () => consoleLogBuffer.join("\n");
const getConsoleWarnOutput = () => consoleWarnBuffer.join("\n");

const logFunction = (...args: unknown[]) => {
  consoleLogBuffer.push(args.join(" "));
};
const warnFunction = (...args: unknown[]) => {
  consoleWarnBuffer.push(args.join(" "));
};

const logOptions = {
  logFunction,
  warnFunction,
};

async function getExpectedSol(fileName = "expected.sol") {
  const expected = fs.readFileSync(fileName, "utf8");

  const hardhatVersion = await getHardhatVersion();
  return expected.replace("{HARDHAT_VERSION}", hardhatVersion);
}

function getContractsOrder(flattenedFiles: string) {
  const CONTRACT_REGEX = /\s*contract(\s+)(\w)/gm;
  const matches = flattenedFiles.match(CONTRACT_REGEX);

  return (matches ?? []).map((m: string) => m.replace("contract", "").trim());
}

async function assertFlattenedFilesResult(flattened: string) {
  const expected = await getExpectedSol();

  assert.equal(flattened, expected);
}

async function createHRE() {
  return createHardhatRuntimeEnvironment({}, {}, process.cwd());
}

describe("flatten/task-action", () => {
  beforeEach(() => {
    // Reset the io buffers
    consoleLogBuffer.length = 0;
    consoleWarnBuffer.length = 0;
  });

  describe("flattenAction", () => {
    describe("when there are no contracts", () => {
      useFixtureProject("flatten-task/no-contracts");

      it("should return an empty string", async () => {
        const hre = await createHRE();
        const { flattened } = await flattenAction(
          { files: [], ...logOptions },
          hre,
        );

        assert.equal(flattened, "");
      });
    });

    describe("when there are contracts", () => {
      useFixtureProject("flatten-task/contracts-project");

      describe("when files are specified as arguments", function () {
        it("should flatten the specified files and dependencies", async () => {
          const hre = await createHRE();
          const { flattened: cFlattened } = await flattenAction(
            { files: ["contracts/C.sol"], ...logOptions },
            hre,
          );
          assert.deepEqual(getContractsOrder(cFlattened), ["C"]);

          const { flattened: bFlattened } = await flattenAction(
            { files: ["contracts/B.sol"], ...logOptions },
            hre,
          );

          assert.deepEqual(getContractsOrder(bFlattened), ["B", "C"]);

          const { flattened: baFlattened } = await flattenAction(
            { files: ["contracts/B.sol", "contracts/A.sol"], ...logOptions },
            hre,
          );

          assert.deepEqual(getContractsOrder(baFlattened), ["A", "B", "C"]);
        });
      });

      describe("when no arguments are passed", function () {
        it("flattens all the project contracts and dependencies", async () => {
          const args: FlattenActionArguments = { files: [], ...logOptions };

          const hre = await createHRE();
          const { flattened } = await flattenAction(args, hre);

          await assertFlattenedFilesResult(flattened);
          assert.deepEqual(getContractsOrder(flattened), ["A", "B", "C"]);
        });
      });
    });

    describe("When has contracts with name clash", function () {
      useFixtureProject("flatten-task/contracts-nameclash-project");

      it("should flatten files sorted correctly with repetition", async function () {
        const hre = await createHRE();
        const { flattened } = await flattenAction(
          { files: [], ...logOptions },
          hre,
        );

        assert.deepEqual(getContractsOrder(flattened), ["A", "B", "C", "C"]);
      });
    });

    describe("When project has multiline imports", function () {
      useFixtureProject("flatten-task/multiline-import-project");

      it("should not include multiline imports", async function () {
        const hre = await createHRE();
        const { flattened } = await flattenAction(
          { files: [], ...logOptions },
          hre,
        );
        assert.ok(
          flattened.includes("} from") === false,
          "Flatten should not include multiline imports",
        );
      });
    });

    describe("project where two contracts import the same dependency", function () {
      useFixtureProject("flatten-task/consistent-build-info-names");

      it("should always produce the same flattened file", async function () {
        const runs = 10;
        const flattenedFiles: string[] = [];

        for (let i = 0; i < runs; i++) {
          const hre = await createHRE();
          const { flattened } = await flattenAction(
            { files: [], ...logOptions },
            hre,
          );

          assert.deepEqual(getContractsOrder(flattened), ["A", "B"]);

          flattenedFiles.push(flattened);
        }

        for (let i = 0; i + 1 < runs; i++) {
          assert.equal(flattenedFiles[i], flattenedFiles[i + 1]);
        }
      });
    });
  });

  describe("SPDX licenses and pragma abicoder directives", () => {
    describe("Flatten files that dont contain SPDX licenses or pragma directives", () => {
      useFixtureProject("flatten-task/contracts-no-spdx-no-pragma");

      it("should successfully flatten and compile the files", async function () {
        const hre = await createHRE();

        const { flattened, metadata } = await flattenAction(
          { files: [], ...logOptions },
          hre,
        );

        await assertFlattenedFilesResult(flattened);

        assert.deepEqual(metadata, {
          filesWithoutLicenses: ["contracts/A.sol", "contracts/B.sol"],
          pragmaDirective: "",
          filesWithoutPragmaDirectives: ["contracts/A.sol", "contracts/B.sol"],
          filesWithDifferentPragmaDirectives: [],
        });
      });
    });

    describe("Flatten files that contain SPDX licenses", () => {
      describe("Files contain one single license per file", () => {
        describe("Files contain same licenses", () => {
          useFixtureProject("flatten-task/contracts-spdx-same-licenses");

          it("should successfully flatten and compile the files", async function () {
            const hre = await createHRE();
            const { flattened, metadata } = await flattenAction(
              { files: [], ...logOptions },
              hre,
            );

            await assertFlattenedFilesResult(flattened);

            assert.deepEqual(metadata, {
              filesWithoutLicenses: [],
              pragmaDirective: "",
              filesWithoutPragmaDirectives: [
                "contracts/A.sol",
                "contracts/B.sol",
              ],
              filesWithDifferentPragmaDirectives: [],
            });
          });
        });

        describe("Files contain different licenses", () => {
          useFixtureProject("flatten-task/contracts-spdx-different-licenses");

          it("should successfully flatten and compile the files", async function () {
            const hre = await createHRE();
            const { flattened, metadata } = await flattenAction(
              { files: [], ...logOptions },
              hre,
            );

            await assertFlattenedFilesResult(flattened);

            assert.deepEqual(metadata, {
              filesWithoutLicenses: [],
              pragmaDirective: "",
              filesWithoutPragmaDirectives: [
                "contracts/A.sol",
                "contracts/B.sol",
              ],
              filesWithDifferentPragmaDirectives: [],
            });
          });
        });
      });

      describe("Files contain multiple licenses", () => {
        describe("Files contain multiple same licenses", () => {
          useFixtureProject(
            "flatten-task/contracts-spdx-same-multiple-licenses",
          );

          it("should successfully flatten and compile the files", async function () {
            const hre = await createHRE();
            const { flattened, metadata } = await flattenAction(
              { files: [], ...logOptions },
              hre,
            );

            await assertFlattenedFilesResult(flattened);

            assert.deepEqual(metadata, {
              filesWithoutLicenses: [],
              pragmaDirective: "",
              filesWithoutPragmaDirectives: [
                "contracts/A.sol",
                "contracts/B.sol",
              ],
              filesWithDifferentPragmaDirectives: [],
            });
          });
        });

        describe("Files contain multiple different licenses", () => {
          useFixtureProject(
            "flatten-task/contracts-spdx-different-multiple-licenses",
          );

          it("should successfully flatten and compile the files", async function () {
            const hre = await createHRE();
            const { flattened, metadata } = await flattenAction(
              { files: [], ...logOptions },
              hre,
            );

            await assertFlattenedFilesResult(flattened);

            assert.deepEqual(metadata, {
              filesWithoutLicenses: [],
              pragmaDirective: "",
              filesWithoutPragmaDirectives: [
                "contracts/A.sol",
                "contracts/B.sol",
                "contracts/C.sol",
              ],
              filesWithDifferentPragmaDirectives: [],
            });
          });
        });
      });
    });

    describe("Flatten files that contain pragma abicoder directives", () => {
      describe("Files contain one single pragma directive per file", () => {
        describe("Files contain same pragma directive", () => {
          useFixtureProject("flatten-task/contracts-pragma-same-directives");

          it("should successfully flatten and compile the files", async function () {
            const hre = await createHRE();
            const { flattened, metadata } = await flattenAction(
              { files: [], ...logOptions },
              hre,
            );

            await assertFlattenedFilesResult(flattened);

            assert.deepEqual(metadata, {
              filesWithoutLicenses: ["contracts/A.sol", "contracts/B.sol"],
              pragmaDirective: "pragma abicoder v1",
              filesWithoutPragmaDirectives: [],
              filesWithDifferentPragmaDirectives: [],
            });
          });
        });

        describe("Files contain different pragma directives", () => {
          useFixtureProject(
            "flatten-task/contracts-pragma-different-directives",
          );

          it("should successfully flatten and compile the files", async function () {
            const hre = await createHRE();
            const { flattened, metadata } = await flattenAction(
              { files: [], ...logOptions },
              hre,
            );

            await assertFlattenedFilesResult(flattened);

            assert.deepEqual(metadata, {
              filesWithoutLicenses: ["contracts/A.sol", "contracts/B.sol"],
              pragmaDirective: "pragma experimental ABIEncoderV2",
              filesWithoutPragmaDirectives: [],
              filesWithDifferentPragmaDirectives: ["contracts/B.sol"],
            });
          });
        });
      });

      describe("Files contain multiple pragma directives", () => {
        useFixtureProject("flatten-task/contracts-pragma-multiple-directives");

        it("should successfully flatten and compile the files", async function () {
          const hre = await createHRE();
          const { flattened, metadata } = await flattenAction(
            { files: [], ...logOptions },
            hre,
          );

          await assertFlattenedFilesResult(flattened);

          assert.deepEqual(metadata, {
            filesWithoutLicenses: ["contracts/A.sol", "contracts/B.sol"],
            pragmaDirective: "pragma abicoder v2",
            filesWithoutPragmaDirectives: [],
            filesWithDifferentPragmaDirectives: ["contracts/A.sol"],
          });
        });
      });
    });

    describe("Files contains several SPDX licenses and pragma directives", () => {
      useFixtureProject(
        "flatten-task/contracts-spdx-licenses-and-pragma-directives",
      );

      it("should successfully flatten and compile the files", async function () {
        const hre = await createHRE();
        const { flattened, metadata } = await flattenAction(
          { files: [], ...logOptions },
          hre,
        );

        await assertFlattenedFilesResult(flattened);

        assert.deepEqual(metadata, {
          filesWithoutLicenses: [],
          pragmaDirective: "pragma abicoder v2",
          filesWithoutPragmaDirectives: [],
          filesWithDifferentPragmaDirectives: ["contracts/A.sol"],
        });
      });
    });

    describe("Check regex rules in files that contains several SPDX licenses and pragma directives", () => {
      useFixtureProject(
        "flatten-task/contracts-regex-spdx-licenses-and-pragma-directives",
      );

      it("should successfully flatten and compile the files", async function () {
        const hre = await createHRE();
        const { flattened, metadata } = await flattenAction(
          { files: [], ...logOptions },
          hre,
        );

        await assertFlattenedFilesResult(flattened);

        assert.deepEqual(metadata, {
          filesWithoutLicenses: [],
          pragmaDirective: "pragma abicoder v2",
          filesWithoutPragmaDirectives: [],
          filesWithDifferentPragmaDirectives: ["contracts/B.sol"],
        });
      });
    });
  });

  describe("Output and warning messages", function () {
    useFixtureProject("flatten-task/contracts-task-flatten");

    it("should console log the flattened files and the warnings about missing licenses and pragma directives", async function () {
      const hre = await createHRE();
      await flattenAction({ files: [], ...logOptions }, hre);
      const expectedOutput = await getExpectedSol();

      assert.equal(getConsoleLogOutput(), expectedOutput);

      assert(
        getConsoleWarnOutput().includes(
          `The following file(s) do NOT specify SPDX licenses: contracts/A.sol, contracts/B.sol, contracts/C.sol`,
        ),
        `Warning message not found`,
      );

      assert(
        getConsoleWarnOutput().includes(
          `Pragma abicoder directives are defined in some files, but they are not defined in the following ones: contracts/A.sol, contracts/B.sol`,
        ),
        `Warning message not found`,
      );

      assert(
        getConsoleWarnOutput().includes(
          `The flattened file is using the pragma abicoder directive 'pragma abicoder v2' but these files have a different pragma abicoder directive: contracts/C.sol`,
        ),
        `Warning message not found`,
      );
    });

    it("should not console warn because licenses and pragma directives are specified", async function () {
      const hre = await createHRE();
      await flattenAction({ files: ["contracts/D.sol"], ...logOptions }, hre);

      assert.equal(getConsoleWarnOutput(), "");
    });
  });

  describe("No contracts to flatten", () => {
    useFixtureProject("flatten-task/no-contracts");

    it("should not throw an error when metadata is null", async function () {
      const hre = await createHRE();
      await flattenAction({ files: [], ...logOptions }, hre);
    });
  });
});
