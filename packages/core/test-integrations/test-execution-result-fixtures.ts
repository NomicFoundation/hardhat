import { assert } from "chai";

import {
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
} from "../src/new-api/internal/new-execution/abi";
import {
  call,
  getNetworkFees,
  getTransactionReceipt,
  sendTransaction,
} from "../src/new-api/internal/new-execution/jsonrpc-calls";
import {
  callEncodingFixtures,
  deploymentFixturesArtifacts,
  staticCallResultFixtures,
  staticCallResultFixturesArtifacts,
} from "../test/helpers/execution-result-fixtures";

import { useHardhatProject } from "./helpers/hardhat-projects";

// See ../test/helpers/execution-result-fixtures.ts
describe("execution-result-fixture tests", function () {
  useHardhatProject("default");

  it("Should have the right values", async function () {
    for (const [name, artifact] of Object.entries(
      staticCallResultFixturesArtifacts
    )) {
      const expectedArtifact = await this.hre.artifacts.readArtifact(name);
      assert.deepEqual(
        artifact,
        expectedArtifact,
        `Artifact ${name} doesn't match`
      );
    }

    const addresses: {
      [contractName: string]: string;
    } = {};

    let nonce = 0;

    for (const [name, artifact] of Object.entries(
      staticCallResultFixturesArtifacts
    )) {
      const fees = await getNetworkFees(this.hre.network.provider);
      const tx = await sendTransaction(this.hre.network.provider, {
        data: encodeArtifactDeploymentData(artifact, [], {}),
        value: 0n,
        from: this.accounts[0],
        nonce: nonce++,
        ...fees,
        gasLimit: 1_000_000n,
      });

      const receipt = await getTransactionReceipt(
        this.hre.network.provider,
        tx
      );
      assert.isDefined(receipt, `No receipt for deployment of ${name}`);
      assert.isDefined(
        receipt!.contractAddress,
        `No receipt address from deployment of ${name}`
      );

      addresses[name] = receipt!.contractAddress!;
    }

    const assertFunctionFixtureMatches = async (
      contractName: string,
      functionName: string
    ) => {
      assert(
        contractName in staticCallResultFixturesArtifacts,
        `Artifact ${contractName} missing from the fixture`
      );

      const expected = await call(
        this.hre.network.provider,
        {
          data: encodeArtifactFunctionCall(
            staticCallResultFixturesArtifacts[contractName],
            functionName,
            []
          ),
          value: 0n,
          from: this.accounts[0],
          to: addresses[contractName]!,
        },
        "latest"
      );

      assert.deepEqual(
        staticCallResultFixtures[contractName][functionName],
        expected,
        `Fixture for [${contractName}]${functionName} doesn't match`
      );
    };

    const contractNames = Object.keys(
      staticCallResultFixturesArtifacts
    ) as string[];

    for (const contractName of contractNames) {
      const artifact = staticCallResultFixturesArtifacts[contractName];

      for (const abiItem of artifact.abi) {
        if (abiItem.type !== "function") {
          continue;
        }

        assert(
          contractName in staticCallResultFixtures,
          `Fixture for ${contractName} missing`
        );
        assert(
          abiItem.name in staticCallResultFixtures[contractName],
          `Fixture for ${contractName}.${abiItem.name} missing`
        );

        await assertFunctionFixtureMatches(contractName, abiItem.name);
      }
    }

    for (const [name, artifact] of Object.entries(
      deploymentFixturesArtifacts
    )) {
      const expectedArtifact = await this.hre.artifacts.readArtifact(name);
      assert.deepEqual(
        artifact,
        expectedArtifact,
        `Artifact ${name} doesn't match`
      );
    }

    for (const [name, artifact] of Object.entries(callEncodingFixtures)) {
      const expectedArtifact = await this.hre.artifacts.readArtifact(name);
      assert.deepEqual(
        artifact,
        expectedArtifact,
        `Artifact ${name} doesn't match`
      );
    }
  });
});
