import { assert } from "chai";
import { useEnvironment } from "../../../helpers/environment";
import { useFixtureProject } from "../../../helpers/project";
import { TASK_COMPILE } from "../../../../src/builtin-tasks/task-names";

describe("eth_getProof", function () {
  // Set up the test environment - not dependent on the fixture project
  useFixtureProject("project-0.8.20");
  useEnvironment();

  it("should return account proof on local network", async function () {
    await this.env.run(TASK_COMPILE, { quiet: true });

    const accounts = await this.env.network.provider.send("eth_accounts");

    assert.ok(
      Array.isArray(accounts) && accounts.length > 0,
      "Accounts should be a non empty array"
    );

    const account = accounts[0];

    const proof: any = await this.env.network.provider.request({
      method: "eth_getProof",
      params: [
        account,
        [], // storage keys (empty array)
        "latest",
      ],
    });

    assert.equal(
      proof.address,
      account,
      "Address should match the requested account"
    );

    // Default hardhat accounts have 10_000 ETH
    assert.equal(
      proof.balance,
      "0x21e19e0c9bab2400000", // numberToHexString(10_000n * 10n ** 18n)
      "Balance should be 10_000 ETH"
    );

    // Check cryptographic proof structure
    assert.ok(
      Array.isArray(proof.accountProof) && proof.accountProof.length > 0,
      "accountProof should be a non empty array"
    );
    assert.ok(
      Array.isArray(proof.storageProof) && proof.storageProof.length === 0,
      // we passed `[]` as storage keys in the request
      "StorageProof should be an empty array for 0 storage keys"
    );
  });

  it("should return storage proof for contract on local network", async function () {
    await this.env.run(TASK_COMPILE, { quiet: true });

    // Define arbitrary address and storage key
    const contractAddress = "0x1234567890123456789012345678901234567890";
    const slotZero =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    const valueOne =
      "0x0000000000000000000000000000000000000000000000000000000000000001";

    // Set storage directly (bypassing deployment & mining)
    await this.env.network.provider.request({
      method: "hardhat_setStorageAt",
      params: [contractAddress, slotZero, valueOne],
    });

    const proof: any = await this.env.network.provider.request({
      method: "eth_getProof",
      params: [contractAddress, [slotZero], "latest"],
    });

    assert.equal(proof.address, contractAddress, "Address should match");
    assert.equal(proof.storageProof.length, 1, "Should return 1 storage proof");
    assert.equal(
      proof.storageProof[0].key,
      slotZero,
      "Storage key should match"
    );
    assert.equal(
      proof.storageProof[0].value,
      "0x1",
      "Storage value should be 0x1"
    );
    assert.ok(
      proof.storageProof[0].proof.length > 0,
      "Storage proof should not be empty"
    );
  });
});
