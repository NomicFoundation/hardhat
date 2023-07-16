import { assert } from "chai";

import { TASK_FLATTEN_GET_FLATTENED_SOURCE } from "../../src/builtin-tasks/task-names";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";
import { compileLiteral } from "../internal/hardhat-network/stack-traces/compilation";

function getContractsOrder(flattenedFiles: string) {
  const CONTRACT_REGEX = /\s*contract(\s+)(\w)/gm;
  const matches = flattenedFiles.match(CONTRACT_REGEX);

  return matches!.map((m: string) => m.replace("contract", "").trim());
}

function getStringOccurrences(file: string, subStr: string): number {
  return file.split(subStr).length - 1;
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
    useFixtureProject("contracts-project");

    it("should flatten files sorted correctly", async function () {
      const flattenedFiles = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );
      assert.deepEqual(getContractsOrder(flattenedFiles), ["C", "B", "A"]);
    });
  });

  describe("When has contracts with name clash", function () {
    useFixtureProject("contracts-nameclash-project");

    it("should flatten files sorted correctly with repetition", async function () {
      const flattenedFiles = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );
      assert.deepEqual(getContractsOrder(flattenedFiles), ["C", "B", "A", "C"]);
    });
  });

  describe("Flattening only some files", function () {
    useFixtureProject("contracts-project");

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
    useFixtureProject("multiline-import-project");

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
    // Licenses
    const LICENSES_HEADER = "// SPDX-License-Identifier:";
    const COMMENTED_LICENSES = "// Original license: SPDX_License_Identifier:";
    // Abi pragma directives
    const PRAGMA_ABICODER_V1 = "pragma abicoder v1";
    const PRAGMA_ABICODER_V2 = "pragma abicoder v2";
    const PRAGMA_EXPERIMENTAL_V2 = "pragma experimental ABIEncoderV2";
    const COMMENTED_PRAGMA_DIRECTIVE = "// Original pragma directive:";

    describe("Flatten files that not contain SPDX licenses or pragma directives", () => {
      useFixtureProject("contracts-no-spdx-no-pragma");

      it("should successfully flatten and compile the files", async function () {
        const flattenedFiles = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE
        );

        // Check that the flattened file compiles correctly
        await compileLiteral(flattenedFiles);

        // Licenses
        assert.isFalse(flattenedFiles.includes(PRAGMA_ABICODER_V1));
        assert.isFalse(flattenedFiles.includes(PRAGMA_ABICODER_V2));
        assert.isFalse(flattenedFiles.includes(PRAGMA_EXPERIMENTAL_V2));

        // Abi pragma directives
        assert.isFalse(flattenedFiles.includes(LICENSES_HEADER));
        assert.isFalse(flattenedFiles.includes(COMMENTED_LICENSES));
      });
    });

    describe("Flatten files that contain SPDX licenses", () => {
      describe("Files contain one single license per file", () => {
        describe("Files contain same licenses", () => {
          useFixtureProject("contracts-spdx-same-licenses");

          it("should successfully flatten and compile the files", async function () {
            const flattenedFiles = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE
            );

            // Check that the flattened file compiles correctly
            await compileLiteral(flattenedFiles);

            assert.equal(
              getStringOccurrences(flattenedFiles, `${LICENSES_HEADER} MIT`),
              1
            );

            assert.equal(
              getStringOccurrences(flattenedFiles, `${COMMENTED_LICENSES} MIT`),
              2
            );
          });
        });

        describe("Files contain different licenses", () => {
          useFixtureProject("contracts-spdx-different-licenses");

          it("should successfully flatten and compile the files", async function () {
            const flattenedFiles = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE
            );

            // Check that the flattened file compiles correctly
            await compileLiteral(flattenedFiles);

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${LICENSES_HEADER} MIT AND MPL-2.0`
              ),
              1
            );

            assert.equal(
              getStringOccurrences(flattenedFiles, `${COMMENTED_LICENSES} MIT`),
              1
            );

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${COMMENTED_LICENSES} MPL-2.0`
              ),
              1
            );
          });
        });
      });

      describe("Files contain multiple licenses", () => {
        describe("Files contain multiple same licenses", () => {
          useFixtureProject("contracts-spdx-same-multiple-licenses");

          it("should successfully flatten and compile the files", async function () {
            const flattenedFiles = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE
            );

            // Check that the flattened file compiles correctly
            await compileLiteral(flattenedFiles);

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${LICENSES_HEADER} Linux-man-pages-1-para AND MIT`
              ),
              1
            );

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${COMMENTED_LICENSES} Linux-man-pages-1-para`
              ),
              2
            );

            assert.equal(
              getStringOccurrences(flattenedFiles, `${COMMENTED_LICENSES} MIT`),
              2
            );
          });
        });

        describe("Files contain multiple different licenses", () => {
          useFixtureProject("contracts-spdx-different-multiple-licenses");

          it("should successfully flatten and compile the files", async function () {
            const flattenedFiles = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE
            );

            // Check that the flattened file compiles correctly
            await compileLiteral(flattenedFiles);

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${LICENSES_HEADER} Linux-man-pages-1-para AND MIT AND MPL-1.1 AND MPL-2.0-no-copyleft-exception`
              ),
              1
            );

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${COMMENTED_LICENSES} Linux-man-pages-1-para`
              ),
              3
            );

            assert.equal(
              getStringOccurrences(flattenedFiles, `${COMMENTED_LICENSES} MIT`),
              1
            );

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${COMMENTED_LICENSES} MPL-1.1`
              ),
              1
            );

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${COMMENTED_LICENSES} MPL-2.0-no-copyleft-exception`
              ),
              2
            );
          });
        });
      });
    });

    describe("Flatten files that contain pragma abicoder directives", () => {
      describe("Files contain one single pragma directive per file", () => {
        describe("Files contain same pragma directive", () => {
          useFixtureProject("contracts-pragma-same-directives");

          it("should successfully flatten and compile the files", async function () {
            const flattenedFiles = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE
            );

            // Check that the flattened file compiles correctly
            await compileLiteral(flattenedFiles);

            assert.equal(
              getStringOccurrences(flattenedFiles, `${PRAGMA_ABICODER_V1};`),
              1
            );

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${COMMENTED_PRAGMA_DIRECTIVE} ${PRAGMA_ABICODER_V1}`
              ),
              2
            );
          });
        });

        describe("Files contain different pragma directives", () => {
          useFixtureProject("contracts-pragma-different-directives");

          it("should successfully flatten and compile the files", async function () {
            const flattenedFiles = await this.env.run(
              TASK_FLATTEN_GET_FLATTENED_SOURCE
            );

            // Check that the flattened file compiles correctly
            await compileLiteral(flattenedFiles);

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${PRAGMA_EXPERIMENTAL_V2};`
              ),
              1
            );

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${COMMENTED_PRAGMA_DIRECTIVE} ${PRAGMA_EXPERIMENTAL_V2}`
              ),
              1
            );

            assert.equal(
              getStringOccurrences(
                flattenedFiles,
                `${COMMENTED_PRAGMA_DIRECTIVE} ${PRAGMA_ABICODER_V1}`
              ),
              1
            );
          });
        });
      });

      describe("Files contain multiple pragma directives", () => {
        useFixtureProject("contracts-pragma-multiple-directives");

        it("should successfully flatten and compile the files", async function () {
          const flattenedFiles = await this.env.run(
            TASK_FLATTEN_GET_FLATTENED_SOURCE
          );

          // Check that the flattened file compiles correctly
          await compileLiteral(flattenedFiles);

          assert.equal(
            getStringOccurrences(flattenedFiles, `${PRAGMA_ABICODER_V2};`),
            1
          );

          assert.equal(
            getStringOccurrences(
              flattenedFiles,
              `${COMMENTED_PRAGMA_DIRECTIVE} ${PRAGMA_ABICODER_V2}`
            ),
            1
          );

          assert.equal(
            getStringOccurrences(
              flattenedFiles,
              `${COMMENTED_PRAGMA_DIRECTIVE} ${PRAGMA_EXPERIMENTAL_V2}`
            ),
            2
          );
        });
      });
    });

    describe("Files contains several SPDX licenses and pragma directives", () => {
      useFixtureProject("contracts-spdx-licenses-and-pragma-directives");

      it("should successfully flatten and compile the files", async function () {
        const flattenedFiles = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE
        );

        // Check that the flattened file compiles correctly
        await compileLiteral(flattenedFiles);

        // Abi pragma directives
        assert.equal(
          getStringOccurrences(flattenedFiles, `${PRAGMA_ABICODER_V2};`),
          1
        );

        assert.equal(
          getStringOccurrences(
            flattenedFiles,
            `${COMMENTED_PRAGMA_DIRECTIVE} ${PRAGMA_ABICODER_V1}`
          ),
          1
        );

        assert.equal(
          getStringOccurrences(
            flattenedFiles,
            `${COMMENTED_PRAGMA_DIRECTIVE} ${PRAGMA_ABICODER_V2}`
          ),
          2
        );

        assert.equal(
          getStringOccurrences(
            flattenedFiles,
            `${COMMENTED_PRAGMA_DIRECTIVE} ${PRAGMA_EXPERIMENTAL_V2}`
          ),
          1
        );

        // Licenses
        assert.equal(
          getStringOccurrences(
            flattenedFiles,
            `${LICENSES_HEADER} Linux-man-pages-1-para AND MIT AND MPL-1.1 AND MPL-2.0-no-copyleft-exception`
          ),
          1
        );

        assert.equal(
          getStringOccurrences(flattenedFiles, `${COMMENTED_LICENSES} MIT`),
          1
        );

        assert.equal(
          getStringOccurrences(
            flattenedFiles,
            `${COMMENTED_LICENSES} Linux-man-pages-1-para`
          ),
          3
        );

        assert.equal(
          getStringOccurrences(
            flattenedFiles,
            `${COMMENTED_LICENSES} MPL-2.0-no-copyleft-exception`
          ),
          2
        );

        assert.equal(
          getStringOccurrences(flattenedFiles, `${COMMENTED_LICENSES} MPL-1.1`),
          1
        );
      });
    });
  });
});
