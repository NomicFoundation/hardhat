import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "@ignored/hardhat-vnext";

describe("Example EDR based test", () => {
  it("should work get the block number from the EDR Network", async () => {
    const connection = await hre.network.connect();

    const blockNumberAtStart = await connection.provider.request({
      method: "eth_blockNumber",
      params: [],
    });

    assert.equal(blockNumberAtStart, `0x0`);

    await connection.networkHelpers.mine(5);

    const blockNumberAfter = await connection.provider.request({
      method: "eth_blockNumber",
      params: [],
    });

    assert.equal(blockNumberAfter, `0x5`);
  });

  it("should show stack traces when a transaction reverts", async () => {
    const connection = await hre.network.connect();

    const Revert = await connection.ethers.getContractFactory("Revert");
    const revert = await Revert.deploy([]);

    try {
      await revert.boom();
    } catch (error) {
      assert.ok(error instanceof Error, "Expected an error to be thrown");

      assert.ok(
        error.stack?.includes("Revert.boom (contracts/Revert.sol:9)"),
        "Stack trace entry expected",
      );

      assert.ok(
        error.stack?.includes("Revert.foo (contracts/Revert.sol:13)"),
        "Stack trace entry expected",
      );

      return;
    }

    assert.fail("Expected an error, but none was thrown");
  });
});
