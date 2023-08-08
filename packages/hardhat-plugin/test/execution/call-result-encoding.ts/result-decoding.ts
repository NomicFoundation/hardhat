import type ethersT from "ethers";

import { assert } from "chai";

import {
  ExecutionError,
  ExecutionErrorTypes,
  call,
  decodeError,
  decodeResult,
  isReturnedInvalidDataExecutionError,
} from "@ignored/ignition-core";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { useEphemeralIgnitionProject } from "../../use-ignition-project";

describe.only("call result decoding", function () {
  // TODO: rename back to minimal api once execution switched over
  useEphemeralIgnitionProject("minimal-new-api");

  let contract: ethersT.Contract;

  beforeEach(async function () {
    const C = await this.hre.ethers.getContractFactory("C");
    contract = await C.deploy();
  });

  async function callAndGetDecodedError(
    hre: HardhatRuntimeEnvironment,
    functionName: string
  ): Promise<{ decoded: ExecutionError | undefined; returnData: string }> {
    const abi = JSON.parse(contract.interface.formatJson()); // TODO: This should be fetched from the deployment
    const to = await contract.getAddress();
    const data = contract.interface.encodeFunctionData(functionName, []);

    const result = await call(hre.network.provider, { to, data }, "latest");

    if (typeof result === "string") {
      const decodedResult = decodeResult(result, abi, functionName);

      return {
        decoded: isReturnedInvalidDataExecutionError(decodedResult)
          ? decodedResult
          : undefined,
        returnData: result,
      };
    }

    const decoded = decodeError(result.returnData, abi, result.isCustomError);

    return { decoded, returnData: result.returnData };
  }

  describe("Successful calls — Decoding results", () => {
    it("Should decode both named un unnamed outputs", async function () {
      const functionName = "withNamedAndUnamedOutputs";
      const abi = JSON.parse(contract.interface.formatJson()); // TODO: This should be fetched from the deployment
      const to = await contract.getAddress();
      const data = contract.interface.encodeFunctionData(functionName, []);

      const result = await call(
        this.hre.network.provider,
        { to, data },
        "latest"
      );

      assert.isString(result);
      const decodedResult = decodeResult(result as string, abi, functionName);

      assert.deepEqual(decodedResult, {
        named: { b: true, h: "hello" },
        numbered: [1n, true, "hello"],
      });
    });
  });

  describe("Failed calls — Decoding errors", function () {
    it("Should return undefined if it doesn't fail and returns a value", async function () {
      const { decoded } = await callAndGetDecodedError(
        this.hre,
        "returnString"
      );
      assert.isUndefined(decoded);
    });

    it("Should return undefined if it doesn't fail and doesn't return a value", async function () {
      const { decoded } = await callAndGetDecodedError(
        this.hre,
        "returnNothing"
      );
      assert.isUndefined(decoded);
    });

    describe("Revert without reason", function () {
      describe("When the function doesn't return anything so its a clash with a revert without reason", () => {
        it("should return RevertWithoutReason", async function () {
          const { decoded } = await callAndGetDecodedError(
            this.hre,
            "revertWithoutReasonClash"
          );

          assert.deepEqual(decoded, {
            type: ExecutionErrorTypes.REVERT_WITHOUT_REASON,
          });
        });
      });

      describe("When the function returns something and there's no clash", async () => {
        it("should return RevertWithoutReason", async function () {
          const { decoded } = await callAndGetDecodedError(
            this.hre,
            "revertWithoutReasonWithoutClash"
          );

          assert.deepEqual(decoded, {
            type: ExecutionErrorTypes.REVERT_WITHOUT_REASON,
          });
        });
      });
    });

    it("should return RevertWithReason if a reason is given", async function () {
      const { decoded } = await callAndGetDecodedError(
        this.hre,
        "revertWithReasonMessage"
      );

      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_REASON,
        message: "reason",
      });
    });

    it("should return RevertWithReason if an empty reason is given", async function () {
      const { decoded } = await callAndGetDecodedError(
        this.hre,
        "revertWithEmptyReasonMessage"
      );

      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_REASON,
        message: "",
      });
    });

    it("should return RevertWithInvalidData if the revert reason signature is used incorrectlt", async function () {
      const { decoded, returnData } = await callAndGetDecodedError(
        this.hre,
        "revertWithInvalidErrorMessage"
      );

      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      });
    });

    it("should return RevertWithPanicCode if a panic code is given", async function () {
      const { decoded } = await callAndGetDecodedError(
        this.hre,
        "revertWithPanicCode"
      );

      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_PANIC_CODE,
        panicCode: 0x12,
        panicCodeName: "DIVIDE_BY_ZERO",
      });
    });

    it("should return RevertWithInvalidData if the panic code signature is used incorrectly", async function () {
      const { decoded, returnData } = await callAndGetDecodedError(
        this.hre,
        "revertWithInvalidErrorMessage"
      );

      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      });
    });

    it("should return RevertWithInvalidData if the panic code signature is used correctly but with a non-existing invalid code", async function () {
      const { decoded, returnData } = await callAndGetDecodedError(
        this.hre,
        "revertWithNonExistentPanicCode"
      );

      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      });
    });

    it("should return RevertWithCustomError if a custom error is used", async function () {
      const { decoded } = await callAndGetDecodedError(
        this.hre,
        "revertWithCustomError"
      );
      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_CUSTOM_ERROR,
        errorName: "CustomError",
        args: {
          numbered: [1n, true],
          named: {
            b: true,
          },
        },
      });
    });

    it("should return RevertWithInvalidData if the custom error signature is used incorrectly", async function () {
      const { decoded, returnData } = await callAndGetDecodedError(
        this.hre,
        "revertWithInvalidCustomError"
      );

      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      });
    });

    it("should return RevertWithUnknownCustomError if the JSON-RPC errors with a message indicating that there was a custom error", async function () {
      if (this.hre.network.name !== "hardhat") {
        return;
      }

      const { decoded, returnData } = await callAndGetDecodedError(
        this.hre,
        "revertWithUnknownCustomError"
      );

      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR,
        signature: returnData.slice(0, 10),
        data: returnData,
      });
    });

    it("should return RevertWithInvalidDataOrUnknownCustomError if the returned data is actually invalid", async function () {
      const { decoded, returnData } = await callAndGetDecodedError(
        this.hre,
        "revertWithInvalidData"
      );

      assert.deepEqual(decoded, {
        type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR,
        signature: returnData.slice(0, 10),
        data: returnData,
      });
    });

    describe("Invalid opcode", () => {
      describe("When the function doesn't return anything so its a clash with an invalid opcode", function () {
        it("should return RevertWithoutReason", async function () {
          const { decoded } = await callAndGetDecodedError(
            this.hre,
            "invalidOpcodeClash"
          );

          assert.deepEqual(decoded, {
            type: ExecutionErrorTypes.REVERT_WITHOUT_REASON,
          });
        });
      });

      describe("When the function returns something and there's no clash", async function () {
        it("should return RevertWithoutReason", async function () {
          const { decoded } = await callAndGetDecodedError(
            this.hre,
            "invalidOpcode"
          );

          assert.deepEqual(decoded, {
            type: ExecutionErrorTypes.REVERT_WITHOUT_REASON,
          });
        });
      });
    });
  });
});
