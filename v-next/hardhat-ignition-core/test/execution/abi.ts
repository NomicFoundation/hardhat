import { assert } from "chai";
import { Artifact } from "hardhat/types";

import { SolidityParameterType } from "../../src/index.js";
import {
  decodeArtifactCustomError,
  decodeArtifactFunctionCallResult,
  decodeError,
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
  validateArtifactFunctionName,
} from "../../src/internal/execution/abi.js";
import { linkLibraries } from "../../src/internal/execution/libraries.js";
import { EvmExecutionResultTypes } from "../../src/internal/execution/types/evm-execution.js";
import { assertValidationError } from "../helpers.js";
import {
  callEncodingFixtures,
  deploymentFixturesArtifacts,
  staticCallResultFixtures,
  staticCallResultFixturesArtifacts,
} from "../helpers/execution-result-fixtures.js";

describe("abi", () => {
  // These tests validate that type conversions from the underlying abi library
  // (ethers v6 as of this writing) are working as expected, and that no type
  // of the library is used directly in the public API.
  describe("Type conversions", () => {
    // To decrease the amount of fixtures, these tests work like this:
    // We have functions that take and receive the same values.
    // Encoding the call and removing the selector would be equivalent to
    // an encoded result, which we decode and test.

    function getDecodedResults(
      artifact: Artifact,
      functionName: string,
      args: SolidityParameterType[],
    ) {
      const encoded = encodeArtifactFunctionCall(artifact, functionName, args);

      // If we remove the selector we should be able to decode the arguments
      // because the result has the same ABI
      const decodeResult = decodeArtifactFunctionCallResult(
        artifact,
        functionName,
        `0x${encoded.substring(10)}`, // Remove the selector
      );

      assert(decodeResult.type === EvmExecutionResultTypes.SUCESSFUL_RESULT);
      return decodeResult.values;
    }

    it("Should decode number types as bigint", () => {
      const args = [1n, -1n, 2n, -2n, 3n, -3n, 4n, -4n];

      const decoded = getDecodedResults(
        callEncodingFixtures.ToTestEthersEncodingConversion,
        "numberTypes",
        args,
      );

      assert.deepEqual(decoded, {
        positional: args,
        named: {},
      });
    });

    it("Should decode booleans as booleans", () => {
      const args = [true, false];

      const decoded = getDecodedResults(
        callEncodingFixtures.ToTestEthersEncodingConversion,
        "booleans",
        args,
      );

      assert.deepEqual(decoded, {
        positional: args,
        named: { f: false },
      });
    });

    it("Should decode byte arrays (sized and dynamic) as strings", () => {
      const args = ["0x00112233445566778899", "0x100122"];

      const decoded = getDecodedResults(
        callEncodingFixtures.ToTestEthersEncodingConversion,
        "byteArrays",
        args,
      );

      assert.deepEqual(decoded, {
        positional: args,
        named: {},
      });
    });

    it("Should decode strings as strings", () => {
      const args = ["hello"];

      const decoded = getDecodedResults(
        callEncodingFixtures.ToTestEthersEncodingConversion,
        "strings",
        args,
      );

      assert.deepEqual(decoded, {
        positional: args,
        named: {},
      });
    });

    it("Should decode addresses as strings", () => {
      const args = ["0x1122334455667788990011223344556677889900"];

      const decoded = getDecodedResults(
        callEncodingFixtures.ToTestEthersEncodingConversion,
        "addresses",
        args,
      );

      assert.deepEqual(decoded, {
        positional: args,
        named: {},
      });
    });

    it("Should decode array (sized and dynamic) as arrays", () => {
      const args = [
        [1n, 2n, 3n],
        ["a", "b"],
        [1n, -2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 0n],
      ];

      const decoded = getDecodedResults(
        callEncodingFixtures.ToTestEthersEncodingConversion,
        "arrays",
        args,
      );

      assert.deepEqual(decoded, {
        positional: args,
        named: {},
      });
    });

    it("Should decode structs as EvmTuples", () => {
      const args = [{ i: 1n }];

      const decoded = getDecodedResults(
        callEncodingFixtures.ToTestEthersEncodingConversion,
        "structs",
        args,
      );

      assert.deepEqual(decoded, {
        positional: [
          {
            positional: [1n],
            named: {
              i: 1n,
            },
          },
        ],
        named: {},
      });
    });

    it("Should decode tuples as EvmTuples (including named and unnamed fields)", () => {
      const args = [1n, 2n];

      const decoded = getDecodedResults(
        callEncodingFixtures.ToTestEthersEncodingConversion,
        "tuple",
        args,
      );

      assert.deepEqual(decoded, {
        positional: args,
        named: {
          named: 2n,
        },
      });
    });

    it("Should apply this rules recursively", () => {
      const args = [[{ i: 1n }, [2n]], [[{ i: 3n }]]];

      const decoded = getDecodedResults(
        callEncodingFixtures.ToTestEthersEncodingConversion,
        "recursiveApplication",
        args,
      );

      assert.deepEqual(decoded, {
        positional: [
          [
            {
              positional: [1n],
              named: {
                i: 1n,
              },
            },
            {
              positional: [2n],
              named: { i: 2n },
            },
          ],
          [
            [
              {
                positional: [3n],
                named: {
                  i: 3n,
                },
              },
            ],
          ],
        ],
        named: {},
      });
    });
  });

  describe("decodeArtifactFunctionCallResult", () => {
    function decodeResult(contractName: string, functionName: string) {
      assert.isDefined(
        staticCallResultFixturesArtifacts[contractName],
        `No artifact for ${contractName}`,
      );
      assert.isDefined(
        staticCallResultFixtures[contractName],
        `No fixtures for ${contractName}`,
      );
      assert.isDefined(
        staticCallResultFixtures[contractName][functionName],
        `No fixtures for ${contractName}.${functionName}`,
      );

      const decoded = decodeArtifactFunctionCallResult(
        staticCallResultFixturesArtifacts[contractName],
        functionName,
        staticCallResultFixtures[contractName][functionName].returnData,
      );

      return {
        decoded,
        returnData:
          staticCallResultFixtures[contractName][functionName].returnData,
      };
    }

    it("Should validate function names", () => {
      const artifact = callEncodingFixtures.WithComplexArguments;
      assert.throws(() => {
        decodeArtifactFunctionCallResult(artifact, "nonExistent", "0x");
      }, "Function 'nonExistent' not found in contract WithComplexArguments");
    });

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
      const { decoded } = decodeResult("C", "getStruct");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.SUCESSFUL_RESULT,
        values: {
          positional: [
            {
              named: {
                i: 123n,
              },
              positional: [123n],
            },
          ],
          named: {},
        },
      });
    });

    // TODO: Validate that we throw a nice error in these cases
    describe.skip("Unsupported return types", () => {
      it("Should throw if a result type is a function", () => {});
      it("Should throw if a result type is a fixed<M>x<N>", () => {});
      it("Should throw if a result type is a ufixed<M>x<N>", () => {});
    });
  });

  describe("encodeArtifactDeploymentData", () => {
    it("Should encode the constructor arguments and append them", async () => {
      const artifact =
        deploymentFixturesArtifacts.WithComplexDeploymentArguments;

      const encoded = encodeArtifactDeploymentData(artifact, [[1n]], {});

      // It should include the number padded to 32 bytes
      assert.equal(encoded, artifact.bytecode + "1".padStart(64, "0"));
    });

    it("Should link libraries", async () => {
      const artifact = deploymentFixturesArtifacts.WithLibrary;
      const libAddress = "0x00000000219ab540356cBB839Cbe05303d7705Fa";

      const libraries = { Lib: libAddress };

      const encoded = encodeArtifactDeploymentData(artifact, [], libraries);

      assert.notEqual(encoded, artifact.bytecode);
      assert.isTrue(encoded.startsWith(linkLibraries(artifact, libraries)));
    });

    // TODO: Validate that we throw a nice error in these cases
    describe.skip("Unsupported return types", () => {
      it("Should throw if an argument type is a function", () => {});
      it("Should throw if an argument type is a fixed<M>x<N>", () => {});
      it("Should throw if an argument type is a ufixed<M>x<N>", () => {});
    });
  });

  describe("encodeArtifactFunctionCall", () => {
    it("Should validate function names", () => {
      const artifact = callEncodingFixtures.WithComplexArguments;
      assert.throws(() => {
        encodeArtifactFunctionCall(artifact, "nonExistent", []);
      }, "Function 'nonExistent' not found in contract WithComplexArguments");
    });

    it("Should encode the arguments and return them", () => {
      const artifact = callEncodingFixtures.WithComplexArguments;
      // S memory s,
      // bytes32 b32,
      // bytes memory b,
      // string[] memory ss

      const args = [
        [1n],
        "0x1122334455667788990011223344556677889900112233445566778899001122",
        "0x1234",
        ["hello", "world"],
      ];
      const encoded = encodeArtifactFunctionCall(artifact, "foo", args);

      // If we remove the selector we should be able to decode the arguments
      // because the result has the same ABI
      const decodeResult = decodeArtifactFunctionCallResult(
        artifact,
        "foo",
        `0x${encoded.substring(10)}`, // Remove the selector
      );

      assert(decodeResult.type === EvmExecutionResultTypes.SUCESSFUL_RESULT);

      assert.deepEqual(decodeResult.values, {
        positional: [
          {
            positional: [1n],
            named: { i: 1n },
          },
          "0x1122334455667788990011223344556677889900112233445566778899001122",
          "0x1234",
          ["hello", "world"],
        ],
        named: {},
      });
    });

    // TODO: Validate that we throw a nice error in these cases
    describe.skip("Unsupported return types", () => {
      it("Should throw if an argument type is a function", () => {});
      it("Should throw if an argument type is a fixed<M>x<N>", () => {});
      it("Should throw if an argument type is a ufixed<M>x<N>", () => {});
    });
  });

  describe("decodeArtifactCustomError", () => {
    it("Should succesfully decode a custom error", () => {
      const artifact = staticCallResultFixturesArtifacts.C;

      const decoded = decodeArtifactCustomError(
        artifact,
        staticCallResultFixtures.C.revertWithCustomError.returnData,
      );

      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_CUSTOM_ERROR,
        errorName: "CustomError",
        args: {
          positional: [1n, true],
          named: {
            b: true,
          },
        },
      });
    });

    it("Should return invalid data error if the custom error is recognized but can't be decoded", () => {
      const artifact = staticCallResultFixturesArtifacts.C;

      const decoded = decodeArtifactCustomError(
        artifact,
        staticCallResultFixtures.C.revertWithInvalidCustomError.returnData,
      );

      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
        data: staticCallResultFixtures.C.revertWithInvalidCustomError
          .returnData,
      });
    });

    it("Should return undefined if no custom error is recognized", () => {
      const artifact = staticCallResultFixturesArtifacts.C;

      const decoded = decodeArtifactCustomError(
        artifact,
        staticCallResultFixtures.C.revertWithUnknownCustomError.returnData,
      );

      assert.isUndefined(decoded);
    });
  });

  describe("Error decoding", () => {
    function decode(
      contractName: keyof typeof staticCallResultFixtures,
      functionName: keyof (typeof staticCallResultFixtures)[typeof contractName],
    ) {
      const decoded = decodeError(
        staticCallResultFixtures[contractName][functionName].returnData,
        staticCallResultFixtures[contractName][functionName]
          .customErrorReported,
        (returnData) =>
          decodeArtifactCustomError(
            staticCallResultFixturesArtifacts[contractName],
            returnData,
          ),
      );

      return {
        decoded,
        returnData:
          staticCallResultFixtures[contractName][functionName].returnData,
      };
    }

    describe("decodeError", () => {
      describe("Revert without reason", () => {
        describe("When the function doesn't return anything so its a clash with a revert without reason", () => {
          it("should return RevertWithoutReason", async () => {
            const { decoded } = decode("C", "revertWithoutReasonClash");

            assert.deepEqual(decoded, {
              type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON,
            });
          });
        });

        describe("When the function returns something and there's no clash", () => {
          it("should return RevertWithoutReason", async () => {
            const { decoded } = decode("C", "revertWithoutReasonWithoutClash");
            assert.deepEqual(decoded, {
              type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON,
            });
          });
        });
      });

      it("should return RevertWithReason if a reason is given", async () => {
        const { decoded } = decode("C", "revertWithReasonMessage");
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_REASON,
          message: "reason",
        });
      });

      it("should return RevertWithReason if an empty reason is given", async () => {
        const { decoded } = decode("C", "revertWithEmptyReasonMessage");
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_REASON,
          message: "",
        });
      });

      it("should return RevertWithInvalidData if the revert reason signature is used incorrectlt", async () => {
        const { decoded, returnData } = decode(
          "C",
          "revertWithInvalidErrorMessage",
        );
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
          data: returnData,
        });
      });

      it("should return RevertWithPanicCode if a panic code is given", async () => {
        const { decoded } = decode("C", "revertWithPanicCode");
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_PANIC_CODE,
          panicCode: 0x12,
          panicName: "DIVIDE_BY_ZERO",
        });
      });

      it("should return RevertWithInvalidData if the panic code signature is used incorrectly", async () => {
        const { decoded, returnData } = decode(
          "C",
          "revertWithInvalidErrorMessage",
        );
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
          data: returnData,
        });
      });

      it("should return RevertWithInvalidData if the panic code signature is used correctly but with a non-existing invalid code", async () => {
        const { decoded, returnData } = decode(
          "C",
          "revertWithNonExistentPanicCode",
        );
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
          data: returnData,
        });
      });

      it("should return RevertWithCustomError if a custom error is used", async () => {
        const { decoded } = decode("C", "revertWithCustomError");
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_CUSTOM_ERROR,
          errorName: "CustomError",
          args: {
            positional: [1n, true],
            named: {
              b: true,
            },
          },
        });
      });

      it("should return RevertWithInvalidData if the custom error signature is used incorrectly", async () => {
        const { decoded, returnData } = decode(
          "C",
          "revertWithInvalidCustomError",
        );
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
          data: returnData,
        });
      });

      it("should return RevertWithUnknownCustomError if the JSON-RPC errors with a message indicating that there was a custom error", async () => {
        const { decoded, returnData } = decode(
          "C",
          "revertWithUnknownCustomError",
        );
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR,
          signature: returnData.slice(0, 10),
          data: returnData,
        });
      });

      it("should return RevertWithInvalidDataOrUnknownCustomError if the returned data is actually invalid", async () => {
        const { decoded, returnData } = decode("C", "revertWithInvalidData");
        assert.deepEqual(decoded, {
          type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR,
          signature: returnData.slice(0, 10),
          data: returnData,
        });
      });

      describe("Invalid opcode", () => {
        describe("When the function doesn't return anything so its a clash with an invalid opcode", () => {
          it("should return RevertWithoutReason", async () => {
            const { decoded } = decode("C", "invalidOpcodeClash");
            assert.deepEqual(decoded, {
              type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON,
            });
          });
        });

        describe("When the function returns something and there's no clash", () => {
          it("should return RevertWithoutReason", async () => {
            const { decoded } = decode("C", "invalidOpcode");
            assert.deepEqual(decoded, {
              type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON,
            });
          });
        });
      });
    });
  });

  describe("validations", () => {
    describe("validateArtifactFunctionName", () => {
      it("Should throw if the function name is not valid", () => {
        assertValidationError(
          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "12",
          ).map((e) => e.message),
          `Invalid function name '12'`,
        );

        assertValidationError(
          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "asd(123, asd",
          ).map((e) => e.message),
          `Invalid function name 'asd(123, asd'`,
        );
      });

      it("Should throw if the function name is not found", () => {
        assertValidationError(
          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "nonExistentFunction",
          ).map((e) => e.message),
          `Function 'nonExistentFunction' not found in contract FunctionNameValidation`,
        );

        assertValidationError(
          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "nonExistentFunction2(uint,bytes32)",
          ).map((e) => e.message),
          `Function 'nonExistentFunction2(uint,bytes32)' not found in contract FunctionNameValidation`,
        );
      });

      describe("Not overlaoded functions", () => {
        it("Should not throw if the bare function name is used and the function exists", () => {
          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "noOverloads",
          );

          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "_$_weirdName",
          );

          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "$_weirdName2",
          );
        });

        it("Should throw if the function name with types is used", () => {
          assertValidationError(
            validateArtifactFunctionName(
              callEncodingFixtures.FunctionNameValidation,
              "noOverloads()",
            ).map((e) => e.message),
            `Function name 'noOverloads()' used for contract FunctionNameValidation, but it's not overloaded. Use 'noOverloads' instead.`,
          );
        });
      });

      describe("Overloaded functions", () => {
        it("Should throw if the bare function name is used", () => {
          assertValidationError(
            validateArtifactFunctionName(
              callEncodingFixtures.FunctionNameValidation,
              "withTypeBasedOverloads",
            ).map((e) => e.message),
            `Function 'withTypeBasedOverloads' is overloaded in contract FunctionNameValidation. Please use one of these names instead:

* withTypeBasedOverloads(uint256)
* withTypeBasedOverloads(int256)`,
          );

          assertValidationError(
            validateArtifactFunctionName(
              callEncodingFixtures.FunctionNameValidation,
              "withParamCountOverloads",
            ).map((e) => e.message),
            `Function 'withParamCountOverloads' is overloaded in contract FunctionNameValidation. Please use one of these names instead:

* withParamCountOverloads()
* withParamCountOverloads(int256)`,
          );
        });

        it("Should throw if the overload described by the function name doesn't exist", () => {
          assertValidationError(
            validateArtifactFunctionName(
              callEncodingFixtures.FunctionNameValidation,
              "withTypeBasedOverloads(bool)",
            ).map((e) => e.message),
            `Function 'withTypeBasedOverloads(bool)' is not a valid overload of 'withTypeBasedOverloads' in contract FunctionNameValidation. Please use one of these names instead:

* withTypeBasedOverloads(uint256)
* withTypeBasedOverloads(int256)`,
          );

          assertValidationError(
            validateArtifactFunctionName(
              callEncodingFixtures.FunctionNameValidation,
              "withParamCountOverloads(bool)",
            ).map((e) => e.message),
            `Function 'withParamCountOverloads(bool)' is not a valid overload of 'withParamCountOverloads' in contract FunctionNameValidation. Please use one of these names instead:

* withParamCountOverloads()
* withParamCountOverloads(int256)`,
          );
        });

        it("Should not throw if the overload described by the function name exists", () => {
          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "withTypeBasedOverloads(uint256)",
          );

          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "withParamCountOverloads(int256)",
          );

          validateArtifactFunctionName(
            callEncodingFixtures.FunctionNameValidation,
            "complexTypeOverload((uint256,uint32,string)[])",
          );
        });
      });
    });

    describe("validateArtifactEventArgumentParams", () => {
      describe("Overloaded event names", () => {
        // This tests should match those of validateArtifactFunctionName
      });

      describe("Param existance validation", () => {
        it("Should throw if the named param doesn't exist", () => {});

        it("Should throw if the positional param doesn't exist", () => {});

        it("Should not throw if the named/positional param doesn't exist", () => {});
      });

      describe("Indexed params", () => {
        it("Should throw when trying to read an indexed string", () => {});

        it("Should throw when trying to read an indexed array", () => {});

        it("Should throw when trying to read an indexed struct", () => {});

        it("Should throw when trying to read an indexed bytes", () => {});

        it("Should not throw when trying to read an indexed address", () => {});

        it("Should not throw when trying to read an indexed uint", () => {});
      });
    });
  });
});
