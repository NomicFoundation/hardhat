import { assert } from "chai";
import fs, { readFileSync } from "fs";

import sinon, { SinonSpy } from "sinon";
import picocolors from "picocolors";
import { removeSync } from "fs-extra";
import { tmpdir } from "os";
import {
  TASK_FLATTEN,
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
  TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA,
} from "../../src/builtin-tasks/task-names";
import { getPackageJson } from "../../src/internal/util/packageInfo";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";
import { compileLiteral } from "../helpers/compilation";

function getContractsOrder(flattenedFiles: string) {
  const CONTRACT_REGEX = /\s*contract(\s+)(\w)/gm;
  const matches = flattenedFiles.match(CONTRACT_REGEX);

  return matches!.map((m: string) => m.replace("contract", "").trim());
}

async function getExpectedSol(fileName = "expected.sol") {
  const expected = fs.readFileSync(fileName, "utf8");

  const hardhatVersion = (await getPackageJson()).version;
  return expected.replace("{HARDHAT_VERSION}", hardhatVersion).trim();
}

async function assertFlattenedFilesResult(flattenedFiles: string) {
  // Check that the flattened file compiles correctly
  await compileLiteral(flattenedFiles);

  const expected = await getExpectedSol();

  assert.equal(flattenedFiles, expected);
}

describe("Flatten task", () => {
  useEnvironment();

  describe("When there no contracts", function () {
    useFixtureProject("default-config-project");

    it("should return empty string", async function () {
      const flattenedFiles = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );

      assert.equal(flattenedFiles.length, 0);
    });
  });

  describe("When has contracts", function () {
    useFixtureProject("flatten-task/contracts-project");

    it("should flatten files sorted correctly", async function () {
      const flattenedFiles = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );
      assert.deepEqual(getContractsOrder(flattenedFiles), ["C", "B", "A"]);
    });
  });

  describe("When has contracts with name clash", function () {
    useFixtureProject("flatten-task/contracts-nameclash-project");

    it("should flatten files sorted correctly with repetition", async function () {
      const flattenedFiles = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );
      assert.deepEqual(getContractsOrder(flattenedFiles), ["C", "B", "A", "C"]);
    });
  });

  describe("Flattening only some files", function () {
    useFixtureProject("flatten-task/contracts-project");

    it("Should accept a list of files, and only flatten those and their dependencies", async function () {
      const cFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/C.sol"],
      });

      assert.deepEqual(getContractsOrder(cFlattened), ["C"]);

      const bFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/B.sol"],
      });

      assert.deepEqual(getContractsOrder(bFlattened), ["C", "B"]);

      const baFlattened = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/B.sol", "contracts/A.sol"],
        }
      );

      assert.deepEqual(getContractsOrder(baFlattened), ["C", "B", "A"]);
    });
  });

  describe("When project has multiline imports", function () {
    useFixtureProject("flatten-task/multiline-import-project");

    it("should not include multiline imports", async function () {
      const flattenedFiles = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );
      assert.isFalse(flattenedFiles.includes("} from"));
    });
  });

  describe("project where two contracts import the same dependency", function () {
    useFixtureProject("consistent-build-info-names");
    useEnvironment();

    it("should always produce the same flattened file", async function () {
      const runs = 100;
      const flattenedFiles: string[] = [];

      for (let i = 0; i < runs; i++) {
        const flattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE);

        flattenedFiles.push(flattened);
      }

      for (let i = 0; i + 1 < runs; i++) {
        assert.equal(flattenedFiles[i], flattenedFiles[i + 1]);
      }
    });
  });

  describe("SPDX licenses and pragma abicoder directives", () => {
    describe("Flatten files that not contain SPDX licenses or pragma directives", () => {
      useFixtureProject("flatten-task/contracts-no-spdx-no-pragma");

      it("should successfully flatten and compile the files", async function () {
        const [flattenedFiles, metadata] = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
        );

        await assertFlattenedFilesResult(flattenedFiles);

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
            const [flattenedFiles, metadata] = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
            );

            await assertFlattenedFilesResult(flattenedFiles);

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
            const [flattenedFiles, metadata] = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
            );

            await assertFlattenedFilesResult(flattenedFiles);

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
            "flatten-task/contracts-spdx-same-multiple-licenses"
          );

          it("should successfully flatten and compile the files", async function () {
            const [flattenedFiles, metadata] = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
            );

            await assertFlattenedFilesResult(flattenedFiles);

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
            "flatten-task/contracts-spdx-different-multiple-licenses"
          );

          it("should successfully flatten and compile the files", async function () {
            const [flattenedFiles, metadata] = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
            );

            await assertFlattenedFilesResult(flattenedFiles);

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
            const [flattenedFiles, metadata] = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
            );

            await assertFlattenedFilesResult(flattenedFiles);

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
            "flatten-task/contracts-pragma-different-directives"
          );

          it("should successfully flatten and compile the files", async function () {
            const [flattenedFiles, metadata] = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
            );

            await assertFlattenedFilesResult(flattenedFiles);

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
          const [flattenedFiles, metadata] = await this.env.run(
            TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
          );

          await assertFlattenedFilesResult(flattenedFiles);

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
        "flatten-task/contracts-spdx-licenses-and-pragma-directives"
      );

      it("should successfully flatten and compile the files", async function () {
        const [flattenedFiles, metadata] = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
        );

        await assertFlattenedFilesResult(flattenedFiles);

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
        "flatten-task/contracts-regex-spdx-licenses-and-pragma-directives"
      );

      it("should successfully flatten and compile the files", async function () {
        const [flattenedFiles, metadata] = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA
        );

        await assertFlattenedFilesResult(flattenedFiles);

        assert.deepEqual(metadata, {
          filesWithoutLicenses: [],
          pragmaDirective: "pragma abicoder v2",
          filesWithoutPragmaDirectives: [],
          filesWithDifferentPragmaDirectives: ["contracts/B.sol"],
        });
      });
    });
  });

  describe("TASK_FLATTEN", () => {
    let spyFunctionConsoleLog: SinonSpy;
    let spyFunctionConsoleWarn: SinonSpy;

    beforeEach(() => {
      spyFunctionConsoleWarn = sinon.stub(console, "warn");
      spyFunctionConsoleLog = sinon.stub(console, "log");
    });

    afterEach(() => {
      spyFunctionConsoleLog.restore();
      spyFunctionConsoleWarn.restore();
    });

    useFixtureProject("flatten-task/contracts-task-flatten");

    it("should console log the flattened files and the warnings about missing licenses and pragma directives", async function () {
      await this.env.run(TASK_FLATTEN);

      const expectedOutput = await getExpectedSol();

      assert(spyFunctionConsoleLog.calledWith(expectedOutput));

      assert(
        spyFunctionConsoleWarn.calledWith(
          picocolors.yellow(
            `\nThe following file(s) do NOT specify SPDX licenses: contracts/A.sol, contracts/B.sol, contracts/C.sol`
          )
        )
      );

      assert(
        spyFunctionConsoleWarn.calledWith(
          picocolors.yellow(
            `\nPragma abicoder directives are defined in some files, but they are not defined in the following ones: contracts/A.sol, contracts/B.sol`
          )
        )
      );

      assert(
        spyFunctionConsoleWarn.calledWith(
          picocolors.yellow(
            `\nThe flattened file is using the pragma abicoder directive 'pragma abicoder v2' but these files have a different pragma abicoder directive: contracts/C.sol`
          )
        )
      );
    });

    it("should not console warn because licenses and pragma directives are specified", async function () {
      await this.env.run(TASK_FLATTEN, {
        files: ["contracts/D.sol"],
      });

      assert(!spyFunctionConsoleWarn.called);
    });

    it("should write to an output file when the parameter output is specified", async function () {
      const outputFile = `${tmpdir()}/flatten.sol`;
      try {
        await this.env.run(TASK_FLATTEN, {
          files: ["contracts/A.sol", "contracts/D.sol"],
          output: outputFile,
        });
        const expected = await getExpectedSol();
        const actual = readFileSync(outputFile, "utf8");
        assert.equal(actual, expected);
      } finally {
        removeSync(outputFile);
      }
    });

    describe("No contracts to flatten", () => {
      useFixtureProject("flatten-task/no-contracts");

      it("should not throw an error when metadata is null", async function () {
        await this.env.run(TASK_FLATTEN);
      });
    });
  });
});
