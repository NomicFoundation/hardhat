import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { exists } from "@nomicfoundation/hardhat-utils/fs";

import { useTestProjectTemplate } from "../resolver/helpers.js";

const basicProjectTemplate = {
  name: "test",
  version: "1.0.0",
  files: {
    "contracts/Foo.sol": `// SPDX-License-Identifier: UNLICENSED \n pragma solidity ^0.8.0; contract Foo {}`,
    "contracts/Foo.t.sol": `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.0;

      import {Foo} from "./Foo.sol";

      contract FooTest {
        Foo foo;

        function setUp() public {
          foo = new Foo();
        }

        function test_Assertion() public view {
          require(1 == 1, "test assertion");
        }
      }
    `,
    "test/OtherFooTest.sol": `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.0;

      import {Foo} from "../contracts/Foo.sol";

      contract OtherFooTest {
        Foo foo;

        function setUp() public {
          foo = new Foo();
        }

        function test_Assertion() public view {
          require(1 == 1, "test assertion");
        }
      }
    `,
  },
};

const unifiedTestsCompilationConfig = {
  solidity: {
    version: "0.8.28",
    splitTestsCompilation: false,
  },
};

describe("artifact API in unified mode", function () {
  it("getAllArtifactPaths includes test artifacts", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);
    const hre = await project.getHRE(unifiedTestsCompilationConfig);

    await hre.tasks.getTask("build").run();

    const allPaths = await hre.artifacts.getAllArtifactPaths();
    const pathsArray = Array.from(allPaths);

    assert.ok(
      pathsArray.some((p) => p.includes("Foo.sol") && !p.includes(".t.sol")),
      "Expected contract artifact path in getAllArtifactPaths",
    );
    assert.ok(
      pathsArray.some((p) => p.includes("Foo.t.sol")),
      "Expected test artifact path (Foo.t.sol) in getAllArtifactPaths",
    );
    assert.ok(
      pathsArray.some((p) => p.includes("OtherFooTest.sol")),
      "Expected test artifact path (OtherFooTest.sol) in getAllArtifactPaths",
    );
  });

  it("getAllFullyQualifiedNames includes test artifacts", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);
    const hre = await project.getHRE(unifiedTestsCompilationConfig);

    await hre.tasks.getTask("build").run();

    const allNames = await hre.artifacts.getAllFullyQualifiedNames();

    assert.ok(
      allNames.has("contracts/Foo.sol:Foo"),
      "Expected contract FQN in getAllFullyQualifiedNames",
    );
    assert.ok(
      allNames.has("contracts/Foo.t.sol:FooTest"),
      "Expected test FQN (FooTest) in getAllFullyQualifiedNames",
    );
    assert.ok(
      allNames.has("test/OtherFooTest.sol:OtherFooTest"),
      "Expected test FQN (OtherFooTest) in getAllFullyQualifiedNames",
    );
  });

  it("bare-name lookup becomes ambiguous when a test and contract share a name", async () => {
    const duplicateNameTemplate = {
      name: "test",
      version: "1.0.0",
      files: {
        "contracts/Foo.sol": `// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0;\ncontract Foo {}`,
        "test/Foo.sol": `// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0;\ncontract Foo {}`,
      },
    };

    await using project = await useTestProjectTemplate(duplicateNameTemplate);
    const hre = await project.getHRE(unifiedTestsCompilationConfig);

    await hre.tasks.getTask("build").run();
    await hre.artifacts.clearCache();

    // Bare-name lookup should throw because both contract and test
    // produce artifacts named "Foo"
    await assertRejectsWithHardhatError(
      hre.artifacts.readArtifact("Foo"),
      HardhatError.ERRORS.CORE.ARTIFACTS.MULTIPLE_FOUND,
      {
        contractName: "Foo",
        candidates: "contracts/Foo.sol:Foo\ntest/Foo.sol:Foo",
      },
    );
  });

  it("fully qualified name lookup still works when a test and contract share a name", async () => {
    const duplicateNameTemplate = {
      name: "test",
      version: "1.0.0",
      files: {
        "contracts/Foo.sol": `// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0;\ncontract Foo {}`,
        "test/Foo.sol": `// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0;\ncontract Foo {}`,
      },
    };

    await using project = await useTestProjectTemplate(duplicateNameTemplate);
    const hre = await project.getHRE(unifiedTestsCompilationConfig);

    await hre.tasks.getTask("build").run();
    await hre.artifacts.clearCache();

    const contractArtifact = await hre.artifacts.readArtifact(
      "contracts/Foo.sol:Foo",
    );
    assert.equal(contractArtifact.contractName, "Foo");

    const testArtifact = await hre.artifacts.readArtifact("test/Foo.sol:Foo");
    assert.equal(testArtifact.contractName, "Foo");
  });

  it("test roots do not get per-source artifacts.d.ts", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);
    const hre = await project.getHRE(unifiedTestsCompilationConfig);

    await hre.tasks.getTask("build").run();

    const artifactsPath = await hre.solidity.getArtifactsDirectory("contracts");

    // Contract root should have artifacts.d.ts
    assert.equal(
      await exists(
        path.join(artifactsPath, "contracts", "Foo.sol", "artifacts.d.ts"),
      ),
      true,
    );

    // Test roots should NOT have artifacts.d.ts
    assert.equal(
      await exists(
        path.join(artifactsPath, "contracts", "Foo.t.sol", "artifacts.d.ts"),
      ),
      false,
    );
    assert.equal(
      await exists(
        path.join(artifactsPath, "test", "OtherFooTest.sol", "artifacts.d.ts"),
      ),
      false,
    );
  });
});
