import { assert } from "chai";

import { TASK_FLATTEN_GET_FLATTENED_SOURCE } from "../../src/builtin-tasks/task-names";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";
import { regexTag } from "../utils/regex-tag";

function getContractsOrder(flattenedFiles: string) {
  const CONTRACT_REGEX = /\s*contract(\s+)(\w+)/gm;
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
      assert.deepEqual(getContractsOrder(flattenedFiles), [
        "C",
        "B",
        "A",
        "BWithLicense",
        "AWithLicense",
        "AWithABIEncoder",
        "BWithABIEncoder",
        "CWithABIEncoder",
        "CWithLicense",
      ]);
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

  describe("Remove licenses", function () {
    useFixtureProject("contracts-project");

    it("Should remove licenses from all files", async function () {
      const aFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/AWithLicense.sol"],
        removeLicenses: true,
      });

      assert.deepEqual(getContractsOrder(aFlattened), [
        "BWithLicense",
        "AWithLicense",
      ]);
      assert.notInclude(aFlattened, "SPDX");

      const abFlattened = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/AWithLicense.sol", "contracts/CWithLicense.sol"],
          removeLicenses: true,
        }
      );

      assert.deepEqual(getContractsOrder(abFlattened), [
        "BWithLicense",
        "AWithLicense",
        "CWithLicense",
      ]);
      assert.notInclude(abFlattened, "SPDX");
    });
  });

  describe("Add license", function () {
    useFixtureProject("contracts-project");

    it("Should add a license", async function () {
      const aFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/AWithLicense.sol"],
        license: "A-LICENSE",
      });

      assert.isTrue(
        aFlattened.includes("// SPDX-License-Identifier: A-LICENSE")
      );

      let abFlattened = await this.env.run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
        files: ["contracts/BWithLicense.sol", "contracts/AWithLicense.sol"],
        license: "A-LICENSE",
      });

      assert.isTrue(
        abFlattened.includes("// SPDX-License-Identifier: A-LICENSE")
      );

      // Replace match
      abFlattened = abFlattened.replace(
        "// SPDX-License-Identifier: A-LICENSE",
        ""
      );

      assert.isFalse(
        abFlattened.includes("// SPDX-License-Identifier: A-LICENSE")
      );
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

  describe("snapshots", function () {
    useFixtureProject("contracts-project");

    const versionPlaceholder = "v\\d+.\\d+.\\d+";

    it("should flatten all the files", async function () {
      const allFlattened = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE
      );

      assert.match(
        allFlattened,
        regexTag`// Sources flattened with hardhat ${versionPlaceholder} https://hardhat.org

// File contracts/C.sol

pragma solidity ^0.5.1
contract C {};

// File contracts/B.sol

pragma solidity ^0.5.1

contract B {}

// File contracts/A.sol

pragma solidity ^0.5.1

contract A {}

// File contracts/BWithLicense.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.5.1
contract BWithLicense {}

// File contracts/AWithLicense.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.5.1

contract AWithLicense {}

// File contracts/AWithABIEncoder.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.5.1
contract AWithABIEncoder {}

// SPDX-License-Identifier: MIT

pragma solidity ^0.5.1
pragma experimental ABIEncoderV2;
contract BWithABIEncoder {}

// SPDX-License-Identifier: MIT

pragma solidity ^0.5.1
pragma experimental ABIEncoderV2;

contract CWithABIEncoder {}

// File contracts/CWithLicense.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.5.1
contract CWithLicense {}`
      );
    });

    it("should flatten one file", async function () {
      const allFlattened = await this.env.run(
        TASK_FLATTEN_GET_FLATTENED_SOURCE,
        {
          files: ["contracts/AWithLicense.sol"],
        }
      );

      assert.match(
        allFlattened,
        regexTag`// Sources flattened with hardhat ${versionPlaceholder} https://hardhat.org

// File contracts/BWithLicense.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.5.1
contract BWithLicense {}

// File contracts/AWithLicense.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.5.1

contract AWithLicense {}`
      );
    });

    describe("removing licenses", function () {
      it("should flatten all the files", async function () {
        const allFlattened = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE,
          {
            removeLicenses: true,
          }
        );

        assert.match(
          allFlattened,
          regexTag`// Sources flattened with hardhat ${versionPlaceholder} https://hardhat.org

// File contracts/C.sol

pragma solidity ^0.5.1
contract C {};

// File contracts/B.sol

pragma solidity ^0.5.1

contract B {}

// File contracts/A.sol

pragma solidity ^0.5.1

contract A {}

// File contracts/BWithLicense.sol

pragma solidity ^0.5.1
contract BWithLicense {}

// File contracts/AWithLicense.sol

pragma solidity ^0.5.1

contract AWithLicense {}

// File contracts/AWithABIEncoder.sol

pragma solidity ^0.5.1
contract AWithABIEncoder {}

pragma solidity ^0.5.1
pragma experimental ABIEncoderV2;
contract BWithABIEncoder {}

pragma solidity ^0.5.1
pragma experimental ABIEncoderV2;

contract CWithABIEncoder {}

// File contracts/CWithLicense.sol

pragma solidity ^0.5.1
contract CWithLicense {}`
        );
      });

      it("should flatten one file", async function () {
        const allFlattened = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE,
          {
            files: ["contracts/AWithLicense.sol"],
            removeLicenses: true,
          }
        );

        assert.match(
          allFlattened,
          regexTag`// Sources flattened with hardhat ${versionPlaceholder} https://hardhat.org

// File contracts/BWithLicense.sol

pragma solidity ^0.5.1
contract BWithLicense {}

// File contracts/AWithLicense.sol

pragma solidity ^0.5.1

contract AWithLicense {}`
        );
      });
    });

    describe("setting a license", function () {
      it("should flatten all the files", async function () {
        const allFlattened = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE,
          {
            license: "MIT",
          }
        );

        assert.match(
          allFlattened,
          regexTag`// Sources flattened with hardhat ${versionPlaceholder} https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/C.sol

pragma solidity ^0.5.1
contract C {};

// File contracts/B.sol

pragma solidity ^0.5.1

contract B {}

// File contracts/A.sol

pragma solidity ^0.5.1

contract A {}

// File contracts/BWithLicense.sol

pragma solidity ^0.5.1
contract BWithLicense {}

// File contracts/AWithLicense.sol

pragma solidity ^0.5.1

contract AWithLicense {}

// File contracts/AWithABIEncoder.sol

pragma solidity ^0.5.1
contract AWithABIEncoder {}

pragma solidity ^0.5.1
pragma experimental ABIEncoderV2;
contract BWithABIEncoder {}

pragma solidity ^0.5.1
pragma experimental ABIEncoderV2;

contract CWithABIEncoder {}

// File contracts/CWithLicense.sol

pragma solidity ^0.5.1
contract CWithLicense {}`
        );
      });

      it("should flatten one file", async function () {
        const allFlattened = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE,
          {
            files: ["contracts/AWithLicense.sol"],
            license: "MIT",
          }
        );

        assert.match(
          allFlattened,
          regexTag`// Sources flattened with hardhat ${versionPlaceholder} https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/BWithLicense.sol

pragma solidity ^0.5.1
contract BWithLicense {}

// File contracts/AWithLicense.sol

pragma solidity ^0.5.1

contract AWithLicense {}`
        );
      });
    });

    describe("unify ABIEncoder V2", function () {
      it("should flatten one file", async function () {
        const allFlattened = await this.env.run(
          TASK_FLATTEN_GET_FLATTENED_SOURCE,
          {
            files: ["contracts/AWithABIEncoder.sol"],
            unifyABIEncoderV2: true,
            license: "MIT",
          }
        );

        assert.match(
          allFlattened,
          regexTag`// Sources flattened with hardhat ${versionPlaceholder} https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/AWithABIEncoder.sol

pragma solidity ^0.5.1
contract AWithABIEncoder {}

pragma solidity ^0.5.1
pragma experimental ABIEncoderV2;
contract BWithABIEncoder {}

pragma solidity ^0.5.1

contract CWithABIEncoder {}`
        );
      });
    });
  });
});
