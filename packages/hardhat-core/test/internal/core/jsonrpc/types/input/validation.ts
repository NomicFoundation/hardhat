import { toBytes } from "@ethereumjs/util";
import { assert } from "chai";
import * as t from "io-ts";

import {
  rpcAddress,
  rpcHash,
  rpcQuantity,
} from "../../../../../../src/internal/core/jsonrpc/types/base-types";
import { optionalRpcNewBlockTag } from "../../../../../../src/internal/core/jsonrpc/types/input/blockTag";
import { validateParams } from "../../../../../../src/internal/core/jsonrpc/types/input/validation";
import { InvalidArgumentsError } from "../../../../../../src/internal/core/providers/errors";

function toBuffer(x: Parameters<typeof toBytes>[0]) {
  return Buffer.from(toBytes(x));
}

describe("validateParams", function () {
  describe("0-arguments", function () {
    it("Should return an empty array if no argument is given", function () {
      assert.deepEqual(validateParams([]), []);
    });

    it("Should throw if params are given", function () {
      assert.throws(() => validateParams([1]), InvalidArgumentsError);
      assert.throws(() => validateParams([1, true]), InvalidArgumentsError);
      assert.throws(() => validateParams([{}]), InvalidArgumentsError);
      assert.throws(
        () => validateParams(["ASD", 123, false]),
        InvalidArgumentsError
      );
    });
  });

  describe("With multiple params", function () {
    it("Should throw if the number of params and arguments doesn't match", function () {
      assert.throws(
        () => validateParams([1], rpcHash, rpcQuantity),
        InvalidArgumentsError
      );
      assert.throws(
        () => validateParams([1, true], rpcHash),
        InvalidArgumentsError
      );
      assert.throws(
        () => validateParams([{}], rpcQuantity, rpcQuantity),
        InvalidArgumentsError
      );
      assert.throws(
        () => validateParams(["ASD", 123, false], rpcQuantity),
        InvalidArgumentsError
      );
    });

    it("Should return the right values", function () {
      assert.deepEqual(
        validateParams(
          ["0x0000000000000000000000000000000000000001"],
          rpcAddress
        ),
        [toBuffer("0x0000000000000000000000000000000000000001")]
      );

      assert.deepEqual(
        validateParams(
          [
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            true,
          ],
          rpcHash,
          t.boolean
        ),
        [
          toBuffer(
            "0x0000000000000000000000000000000000000000000000000000000000000001"
          ),
          true,
        ]
      );
    });
  });

  describe("Optional params", function () {
    it("Should fail if less than the minimum number of params are received", function () {
      assert.throws(
        () => validateParams([], rpcHash, optionalRpcNewBlockTag),
        InvalidArgumentsError
      );
    });

    it("Should fail if more than the maximum number of params are received", function () {
      assert.throws(
        () =>
          validateParams(
            [
              "0x0000000000000000000000000000000000000000000000000000000000000001",
              "latest",
              123,
            ],
            rpcHash,
            optionalRpcNewBlockTag
          ),
        InvalidArgumentsError
      );
    });

    it("Should return undefined if optional params are missing", function () {
      assert.deepEqual(
        validateParams(
          [
            "0x0000000000000000000000000000000000000000000000000000000000000001",
          ],
          rpcHash,
          optionalRpcNewBlockTag
        ),
        [
          toBuffer(
            "0x0000000000000000000000000000000000000000000000000000000000000001"
          ),
          undefined,
        ]
      );

      assert.deepEqual(
        validateParams(
          ["0x1111111111111111111111111111111111111111"],
          rpcAddress,
          optionalRpcNewBlockTag
        ),
        [toBuffer("0x1111111111111111111111111111111111111111"), undefined]
      );
    });
  });
});
