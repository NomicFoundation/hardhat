import { assert } from "chai";

import { decodeArtifactFunctionCallResult } from "../../../src/new-api/internal/new-execution/abi";
import { EvmExecutionResultTypes } from "../../../src/new-api/internal/new-execution/types/evm-execution";
import { artifacts, fixtures } from "../../helpers/execution-result-fixtures";

describe("abi", () => {
  // These tests validate that type conversions from the underlying abi library
  // (ethers v6 as of this writing) are working as expected, and that no type
  // of the library is used directly in the public API.
  describe("Type conversions", () => {
    // TODO @alcuadrado
  });

  describe("decodeArtifactFunctionCallResult", () => {
    function decodeResult(contractName: string, functionName: string) {
      assert.isDefined(
        artifacts[contractName],
        `No artifact for ${contractName}`
      );
      assert.isDefined(
        fixtures[contractName],
        `No fixtures for ${contractName}`
      );
      assert.isDefined(
        fixtures[contractName][functionName],
        `No fixtures for ${contractName}.${functionName}`
      );

      const decoded = decodeArtifactFunctionCallResult(
        artifacts[contractName],
        functionName,
        fixtures[contractName][functionName].returnData
      );

      return {
        decoded,
        returnData: fixtures[contractName][functionName].returnData,
      };
    }

    it("Should be able to decode a single successful result", () => {
      const { decoded } = decodeResult("C", "returnString");

      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.SUCESSFUL_RESULT,
        values: {
          positional: ["hello"],
          named: {},
        },
      });
    });

    it("Should be able to decode a succesful result without return values", () => {
      const { decoded } = decodeResult("C", "returnNothing");

      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.SUCESSFUL_RESULT,
        values: {
          positional: [],
          named: {},
        },
      });
    });

    it("Should be able to decode a succesful result with named and unnamed values", () => {
      const { decoded } = decodeResult("C", "withNamedAndUnamedOutputs");

      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.SUCESSFUL_RESULT,
        values: {
          positional: [1n, true, "hello"],
          named: { b: true, h: "hello" },
        },
      });
    });

    it("Should decode all numbers as bigint and byte types as 0x-prefixed hex strings", () => {
      const { decoded } = decodeResult("C", "withReturnTypes");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.SUCESSFUL_RESULT,
        values: {
          positional: [
            2n,
            3n,
            4n,
            5n,
            "0x11000000000000000000",
            "0xaa",
            [1n, 2n],
            [123n],
          ],
          named: {},
        },
      });
    });

    it("Should be able to decode structs", () => {
      // TODO @alcuadrado
    });

    it("Should throw if a result type is a function", () => {
      // TODO @alcuadrado
    });

    it("Should throw if a result type is a fixed<M>x<N>", () => {
      // TODO @alcuadrado
    });

    it("Should throw if a result type is a ufixed<M>x<N>", () => {
      // TODO @alcuadrado
    });
  });

  describe("encodeArtifactDeploymentData", () => {
    it("Should encode the constructor arguments and append them", () => {
      // TODO @alcuadrado
    });

    it("Should link libraries", () => {
      // TODO @alcuadrado
    });

    it("Should throw if an argument type is a function", () => {
      // TODO @alcuadrado
    });

    it("Should throw if an argument type is a fixed<M>x<N>", () => {
      // TODO @alcuadrado
    });

    it("Should throw if an argument type is a ufixed<M>x<N>", () => {
      // TODO @alcuadrado
    });
  });

  describe("linkLibraries", () => {
    it("Should throw if a library name is not recognized", () => {
      // TODO @alcuadrado
    });

    it("Should throw if a library name is ambiguous", () => {
      // TODO @alcuadrado
    });

    it("Should throw if a library is missing", () => {
      // TODO @alcuadrado
    });

    it("Should support bare names if non-ambiguous", () => {
      // TODO @alcuadrado
    });

    it("Should support fully qualified names", () => {
      // TODO @alcuadrado
    });
  });

  describe("encodeArtifactFunctionCall", () => {
    it("Should throw if an argument type is a function", () => {
      // TODO @alcuadrado
    });

    it("Should throw if an argument type is a fixed<M>x<N>", () => {
      // TODO @alcuadrado
    });

    it("Should throw if an argument type is a ufixed<M>x<N>", () => {
      // TODO @alcuadrado
    });

    it("Should encode the arguments and return them", () => {
      // TODO @alcuadrado
    });
  });

  describe("decodeArtifactCustomError", () => {
    it("Should succesfully decode a custom error", () => {
      // TODO @alcuadrado
    });

    it("Should return invalid data error if the custom error is recognized but can't be decoded", () => {
      // TODO @alcuadrado
    });

    it("Should return undefined if no custom error is recognized", () => {
      // TODO @alcuadrado
    });
  });
});
