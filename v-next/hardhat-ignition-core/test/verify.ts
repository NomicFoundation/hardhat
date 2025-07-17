import path from "node:path";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { type VerifyResult, getVerificationInformation } from "../src/index.js";

// eslint-disable-next-line @typescript-eslint/naming-convention -- temp fix
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("verify", () => {
  it("should not verify an uninitialized deployment", async () => {
    await assertRejectsWithHardhatError(
      getVerificationInformation("test").next(),
      HardhatError.ERRORS.IGNITION.VERIFY.UNINITIALIZED_DEPLOYMENT,
      {
        deploymentDir: "test",
      },
    );
  });

  it("should not verify a deployment that did not deploy any contracts", async () => {
    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "verify",
      "no-contracts",
    );

    await assertRejectsWithHardhatError(
      getVerificationInformation(deploymentDir).next(),
      HardhatError.ERRORS.IGNITION.VERIFY.NO_CONTRACTS_DEPLOYED,
      {
        deploymentDir,
      },
    );
  });

  it("should yield a verify result", async () => {
    const expectedResult: VerifyResult = {
      address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      contract: "contracts/Lock.sol:Lock",
      constructorArgs: [1987909200],
      libraries: {},
    };

    const deploymentDir = path.join(__dirname, "mocks", "verify", "success");

    const result = (await getVerificationInformation(deploymentDir).next())
      .value;

    assert.deepEqual(result, expectedResult);
  });

  it("should yield a null verify result for a contract with external artifacts", async () => {
    const expectedResult1: VerifyResult = "LockModule#Basic";

    const expectedResult2: VerifyResult = {
      address: "0x8f19334E79b16112E2D74E9Bc2246cB3cbA3cfaa",
      contract: "contracts/Lock.sol:Lock",
      constructorArgs: [1987909200],
      libraries: {},
    };

    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "verify",
      "external-artifacts",
    );

    const generator = getVerificationInformation(deploymentDir);

    const result1 = (await generator.next()).value;

    assert.deepEqual(result1, expectedResult1);

    const result2: VerifyResult = await (await generator.next()).value;

    assert.deepEqual(result2, expectedResult2);
  });

  it("should yield a verify result for contract with libraries", async () => {
    const librariesResult = {
      UUUUU: "0x0B014cb3B1AF9F45123195B37538Fb9dB6F5eF5F",
    };

    const deploymentDir = path.join(__dirname, "mocks", "verify", "libraries");

    let success: boolean = false;
    for await (const info of getVerificationInformation(deploymentDir)) {
      assert(typeof info !== "string", "Expected a VerifyInfo, got a string");

      if (info.contract === "contracts/Lock.sol:WAAIT") {
        assert.deepEqual(info.libraries, librariesResult);
        success = true;
        break;
      }
    }

    assert.isTrue(success);
  });
});
