import { assert } from "chai";

import {
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
} from "../src/internal/execution/abi.js";
import {
  callEncodingFixtures,
  deploymentFixturesArtifacts,
  staticCallResultFixtures,
  staticCallResultFixturesArtifacts,
} from "../test/helpers/execution-result-fixtures.js";

import { useHardhatProject } from "./helpers/hardhat-projects.js";
import { createClient } from "./helpers/create-hre.js";

// See ../test/helpers/execution-result-fixtures.ts
describe("execution-result-fixture tests", function () {
  useHardhatProject("default");

  it("Should have the right values", async function () {
    const { client, hre, connection } = await createClient();

    const accounts = await connection.provider.request({
      method: "eth_accounts",
      params: [],
    });

    for (const [name, artifact] of Object.entries(
      staticCallResultFixturesArtifacts,
    )) {
      const expectedArtifact = await hre.artifacts.readArtifact(name);
      assert.deepEqual(
        artifact,
        expectedArtifact,
        `Artifact ${name} doesn't match`,
      );
    }

    const addresses: {
      [contractName: string]: string;
    } = {};

    let nonce = 0;

    for (const [name, artifact] of Object.entries(
      staticCallResultFixturesArtifacts,
    )) {
      const fees = await client.getNetworkFees();
      const tx = await client.sendTransaction({
        data: encodeArtifactDeploymentData(artifact, [], {}),
        value: 0n,
        from: accounts[0],
        nonce: nonce++,
        fees,
        gasLimit: 1_000_000n,
      });

      const receipt = await client.getTransactionReceipt(tx);
      assert.isDefined(receipt, `No receipt for deployment of ${name}`);
      assert.isDefined(
        receipt!.contractAddress,
        `No receipt address from deployment of ${name}`,
      );

      addresses[name] = receipt!.contractAddress!;
    }

    const assertFunctionFixtureMatches = async (
      contractName: string,
      functionName: string,
    ) => {
      assert(
        contractName in staticCallResultFixturesArtifacts,
        `Artifact ${contractName} missing from the fixture`,
      );

      const expected = await client.call(
        {
          data: encodeArtifactFunctionCall(
            staticCallResultFixturesArtifacts[contractName],
            functionName,
            [],
          ),
          value: 0n,
          from: accounts[0],
          to: addresses[contractName]!,
        },
        "latest",
      );

      assert.deepEqual(
        staticCallResultFixtures[contractName][functionName],
        expected,
        `Fixture for [${contractName}]${functionName} doesn't match`,
      );
    };

    const contractNames = Object.keys(
      staticCallResultFixturesArtifacts,
    ) as string[];

    for (const contractName of contractNames) {
      const artifact = staticCallResultFixturesArtifacts[contractName];

      for (const abiItem of artifact.abi.filter(
        // TODO: bring this back once EDR bug has been fixed
        (abi) => abi.name !== "revertWithInvalidErrorMessage",
      )) {
        if (abiItem.type !== "function") {
          continue;
        }

        assert(
          contractName in staticCallResultFixtures,
          `Fixture for ${contractName} missing`,
        );
        assert(
          abiItem.name in staticCallResultFixtures[contractName],
          `Fixture for ${contractName}.${abiItem.name} missing`,
        );

        await assertFunctionFixtureMatches(contractName, abiItem.name);
      }
    }

    for (const [name, artifact] of Object.entries(
      deploymentFixturesArtifacts,
    )) {
      const expectedArtifact = await hre.artifacts.readArtifact(name);
      assert.deepEqual(
        artifact,
        expectedArtifact,
        `Artifact ${name} doesn't match`,
      );
    }

    for (const [name, artifact] of Object.entries(callEncodingFixtures)) {
      const expectedArtifact = await hre.artifacts.readArtifact(name);
      assert.deepEqual(
        artifact,
        expectedArtifact,
        `Artifact ${name} doesn't match`,
      );
    }
  });
});
