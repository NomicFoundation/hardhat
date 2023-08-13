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
import { fixture, artifact } from "../test/helpers/execution-result-fixtures";

import { useHardhatProject } from "./helpers/hardhat-projects";

// See ../test/helpers/execution-result-fixtures.ts
describe("execution-result-fixture tests", function () {
  useHardhatProject("default");

  it("Should have the right values", async function () {
    const expectedArtifact = await this.hre.artifacts.readArtifact("C");

    assert.deepEqual(artifact, expectedArtifact);

    const fees = await getNetworkFees(this.hre.network.provider);

    const tx = await sendTransaction(this.hre.network.provider, {
      data: await encodeArtifactDeploymentData(artifact, [], {}),
      value: 0n,
      from: this.accounts[0],
      nonce: 0,
      ...fees,
      gasLimit: 1_000_000n,
    });

    const receipt = await getTransactionReceipt(this.hre.network.provider, tx);
    assert.isDefined(receipt);
    assert.isDefined(receipt!.contractAddress);

    const contractAddress = receipt!.contractAddress!;

    const assertFunctionFixtureMatches = async (
      functionName: keyof typeof fixture
    ) => {
      const expected = await call(
        this.hre.network.provider,
        {
          data: encodeArtifactFunctionCall(artifact, functionName, []),
          value: 0n,
          from: this.accounts[0],
          to: contractAddress,
        },
        "latest"
      );

      assert.deepEqual(
        fixture[functionName],
        expected,
        `Fixture for ${functionName} doesn't match`
      );
    };

    await assertFunctionFixtureMatches("returnString");
    await assertFunctionFixtureMatches("returnNothing");
    await assertFunctionFixtureMatches("revertWithoutReasonClash");
    await assertFunctionFixtureMatches("revertWithoutReasonWithoutClash");
    await assertFunctionFixtureMatches("revertWithReasonMessage");
    await assertFunctionFixtureMatches("revertWithEmptyReasonMessage");
    await assertFunctionFixtureMatches("revertWithInvalidErrorMessage");
    await assertFunctionFixtureMatches("revertWithPanicCode");
    await assertFunctionFixtureMatches("revertWithInvalidPanicCode");
    await assertFunctionFixtureMatches("revertWithNonExistentPanicCode");
    await assertFunctionFixtureMatches("revertWithCustomError");
    await assertFunctionFixtureMatches("revertWithInvalidCustomError");
    await assertFunctionFixtureMatches("revertWithUnknownCustomError");
    await assertFunctionFixtureMatches("revertWithInvalidData");
    await assertFunctionFixtureMatches("invalidOpcode");
    await assertFunctionFixtureMatches("invalidOpcodeClash");
    await assertFunctionFixtureMatches("withNamedAndUnamedOutputs");
    await assertFunctionFixtureMatches("withReturnTypes");
  });
});
