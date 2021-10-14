import { assert } from "chai";
import { match } from "sinon-chai/node_modules/@types/sinon";

import { TASK_FLATTEN_GET_FLATTENED_SOURCE } from "../../src/builtin-tasks/task-names";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

function getContractsOrder(flattenedFiles: string) {
  const CONTRACT_REGEX = /\s*contract(\s+)(\w)/gm;
  const matches = flattenedFiles.match(CONTRACT_REGEX);

  return matches
}

function getLicenseCount(flattenedFiles: string) {
    const LicenseRegex = /\s*\/\/(\s+)SPDX-License-Identifier:(\s+)(\w+)/gm;
    const matches = flattenedFiles.match(LicenseRegex)

    return matches!.length
}

describe("Flatten task", () => {
  useEnvironment();

  describe("Same license in all files", function () {
    useFixtureProject("project-with-license-abicoder");

    it("should contain only one license", async function () {
      const FooFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/Foo.sol"],
      });

      assert.equal(getLicenseCount(FooFlattened), 1)
    });
  });
});
