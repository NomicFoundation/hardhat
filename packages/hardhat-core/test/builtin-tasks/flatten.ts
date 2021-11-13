import { assert } from "chai";

import { TASK_FLATTEN_GET_FLATTENED_SOURCE } from "../../src/builtin-tasks/task-names";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

function getContractsOrder(flattenedFiles: string) {
  const CONTRACT_REGEX = /\s*contract(\s+)(\w)/gm;
  const matches = flattenedFiles.match(CONTRACT_REGEX);

  return matches!.map((m: string) => m.replace("contract", "").trim());
}

function getLicenseCount(flattenedFiles: string) {
  const LicenseRegex =
    /\s*\/\/(\s+)SPDX-License-Identifier:(\s+)([a-zA-Z0-9._-\s]+)/gm;
  const matches = flattenedFiles.match(LicenseRegex);
  return matches!.length;
}

function getLicense(flattenedFiles: string) {
  const LicenseRegex =
    /\s*\/\/(\s+)SPDX-License-Identifier:(\s+)([a-zA-Z0-9._-\s]+)/gm;
  const matches = flattenedFiles.match(LicenseRegex);
  if (matches) {
    return matches[0].trim();
  } else {
    return "";
  }
}

function getPragma(flattenedFiles: string) {
  const PragmaRegex = /pragma(\s)([a-zA-Z]+)(\s)([a-zA-Z0-9^.]+);/gm;
  const matches = flattenedFiles.match(PragmaRegex);
  return matches;
}

describe("Flatten task", () => {
  useEnvironment();

  describe("Different pragmas", function () {
    useFixtureProject("project-with-pragma");

    it("should contain pragma v2", async function () {
      const [FooFlattened, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/A.sol", "contracts/B.sol"],
        }
      );

      const pragma = getPragma(FooFlattened);
      if (pragma) {
        assert.equal(pragma.length, 1);
        assert.isTrue(pragma[0].includes("v2"));
      } else {
        assert.fail("should return pragma");
      }
    });
  });

  describe("Only one file has pragma", function () {
    useFixtureProject("project-with-pragma");

    it("should contain only one pragma", async function () {
      const [FooFlattened, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/Foo.sol", "contracts/Bar.sol"],
        }
      );

      const pragma = getPragma(FooFlattened);
      assert.equal(pragma?.length, 1);
    });
  });

  describe("Same pragma in all files", function () {
    useFixtureProject("project-with-pragma");

    it("should contain only one pragma", async function () {
      const [FooFlattened, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/Foo.sol", "contracts/A.sol"],
        }
      );

      const pragma = getPragma(FooFlattened);
      assert.equal(pragma?.length, 1);
    });
  });

  describe("Same license in all files", function () {
    useFixtureProject("project-with-license");

    it("should contain only one license", async function () {
      const [FooFlattened, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/Foo.sol"],
        }
      );

      assert.equal(getLicenseCount(FooFlattened), 1);
    });
  });

  describe("Only one file has license", function () {
    useFixtureProject("project-with-license");

    it("should contain only one license", async function () {
      const [FooFlattened, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/A.sol"],
        }
      );

      assert.equal(getLicenseCount(FooFlattened), 1);
    });
  });

  describe("Different licenses", function () {
    useFixtureProject("project-with-license");

    it("should contain only one combined license", async function () {
      const [FooFlattened, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/C.sol"],
        }
      );
      assert.equal(
        getLicense(FooFlattened),
        "// SPDX-License-Identifier: MIT AND MPL-2.0"
      );
    });
  });

  describe("When there no contracts", function () {
    useFixtureProject("default-config-project");

    it("should return empty string", async function () {
      const [flattenedFiles, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );

      console.log("empty string", flattenedFiles);

      assert.equal(flattenedFiles.length, 0);
    });
  });

  describe("When has contracts", function () {
    useFixtureProject("contracts-project");

    it("should flatten files sorted correctly", async function () {
      const [flattenedFiles, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );
      assert.deepEqual(getContractsOrder(flattenedFiles), ["C", "B", "A"]);
    });
  });

  describe("When has contracts with name clash", function () {
    useFixtureProject("contracts-nameclash-project");

    it("should flatten files sorted correctly with repetition", async function () {
      const [flattenedFiles, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );
      assert.deepEqual(getContractsOrder(flattenedFiles), ["C", "B", "A", "C"]);
    });
  });

  describe("Flattening only some files", function () {
    useFixtureProject("contracts-project");

    it("Should accept a list of files, and only flatten those and their dependencies", async function () {
      const [cFlattened, _w] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/C.sol"],
        }
      );

      assert.deepEqual(getContractsOrder(cFlattened), ["C"]);

      const [bFlattened, _w2] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/B.sol"],
        }
      );

      assert.deepEqual(getContractsOrder(bFlattened), ["C", "B"]);

      const [baFlattened, _w3] = await this.env.run(
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
      const [flattenedFiles, _] = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );
      assert.isFalse(flattenedFiles.includes("} from"));
    });
  });
});
