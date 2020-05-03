import { assert } from "chai";
import { toBuffer } from "ethereumjs-util";
import * as t from "io-ts";

import { InvalidArgumentsError } from "../../../../src/internal/buidler-evm/provider/errors";
import {
  optionalBlockTag,
  rpcAddress,
  rpcHash,
  rpcQuantity,
  validateParams,
} from "../../../../src/internal/buidler-evm/provider/input";
import { setCWD } from "../helpers/cwd";

describe("validateParams", function () {
  setCWD();

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
        () => validateParams([], rpcHash, optionalBlockTag),
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
            optionalBlockTag
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
          optionalBlockTag
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
          optionalBlockTag
        ),
        [toBuffer("0x1111111111111111111111111111111111111111"), undefined]
      );
    });
  });
});
