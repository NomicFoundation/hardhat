import { assert } from "chai";

import { TASK_FLATTEN_GET_FLATTENED_SOURCE } from "../../src/builtin-tasks/task-names";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

function getContractsOrder(flattenedFiles: string) {
  const CONTRACT_REGEX = /\s*contract(\s+)(\w)/gm;
  const matches = flattenedFiles.match(CONTRACT_REGEX);

  return matches!.map((m: string) => m.replace("contract", "").trim());
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

  describe("Remove licences", function () {
    useFixtureProject("contracts-project");

    it("Should remove licences from all files", async function () {
      const aFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/AWithLicence.sol"], shouldRemoveLicences: true
      });

      assert.deepEqual(getContractsOrder(aFlattened), ["C", "B", "A"]);

      const abFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/BWithLicence.sol", "contracts/AWithLicence.sol"], shouldRemoveLicences: true
      });

      assert.deepEqual(getContractsOrder(abFlattened), ["C", "B", "B", "A"]);
    });
  });

  describe("Add licence", function () {
    useFixtureProject("contracts-project");

    it("Should add a licence", async function () {
      const aFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/AWithLicence.sol"], licence: 'A-LICENCE'
      });

      assert.isTrue(aFlattened.includes("// SPDX-License-Identifier: A-LICENCE"));

      let abFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/BWithLicence.sol", "contracts/AWithLicence.sol"], licence: 'A-LICENCE'
      });

      assert.isTrue(abFlattened.includes("// SPDX-License-Identifier: A-LICENCE"));

      // Replace match
      abFlattened = abFlattened.replace("// SPDX-License-Identifier: A-LICENCE", '')

      assert.isFalse(abFlattened.includes("// SPDX-License-Identifier: A-LICENCE"));
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
});
