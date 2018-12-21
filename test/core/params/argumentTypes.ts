import { assert } from "chai";

import { ERRORS } from "../../../src/core/errors";
import * as types from "../../../src/core/params/argumentTypes";
import { expectBuidlerError } from "../../helpers/errors";

function a(f: () => any) {
  expectBuidlerError(f, ERRORS.ARG_TYPE_INVALID_VALUE);
}

describe("argumentTypes", () => {
  it("should set the right name to all the argument types", () => {
    for (const typeName of Object.keys(types)) {
      const argumentTypesMap: {
        [name: string]: types.ArgumentType<any>;
      } = types;
      assert.equal(argumentTypesMap[typeName].name, typeName);
    }
  });

  describe("string type", () => {
    it("should work with valid values", () => {
      assert.equal(types.string.parse("arg", "asd"), "asd");
      assert.equal(types.string.parse("arg", "asd1"), "asd1");
      assert.equal(types.string.parse("arg", "asd 123"), "asd 123");
      assert.equal(types.string.parse("arg", "1"), "1");
      assert.equal(types.string.parse("arg", ""), "");
    });
  });

  describe("boolean type", () => {
    it("should work with valid values", () => {
      assert.equal(types.boolean.parse("arg", "true"), true);
      assert.equal(types.boolean.parse("arg", "false"), false);
    });

    it("should throw the right error on invalid values", () => {
      expectBuidlerError(
        () => types.boolean.parse("arg", "asd1"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.boolean.parse("arg", "f"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.boolean.parse("arg", "t"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.boolean.parse("arg", "1"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.boolean.parse("arg", "0"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.boolean.parse("arg", ""),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
    });
  });

  describe("int type", () => {
    it("should work with decimal values", () => {
      assert.equal(types.int.parse("arg", "0"), 0);
      assert.equal(types.int.parse("arg", "1"), 1);
      assert.equal(types.int.parse("arg", "1123"), 1123);
      assert.equal(types.int.parse("arg", "05678"), 5678);
    });

    it("should work with hex values", () => {
      assert.equal(types.int.parse("arg", "0x0"), 0);
      assert.equal(types.int.parse("arg", "0x1"), 1);
      assert.equal(types.int.parse("arg", "0xA"), 0xa);
      assert.equal(types.int.parse("arg", "0xa"), 0xa);
      assert.equal(types.int.parse("arg", "0x0a"), 0x0a);
    });

    it("should work with decimal scientific notation", () => {
      assert.equal(types.int.parse("arg", "1e0"), 1);
      assert.equal(types.int.parse("arg", "1e123"), 1e123);
      assert.equal(types.int.parse("arg", "12e0"), 12);
      assert.equal(types.int.parse("arg", "012e1"), 120);
      assert.equal(types.int.parse("arg", "0e12"), 0);
    });

    it("should fail with incorrect values", () => {
      expectBuidlerError(
        () => types.int.parse("arg", ""),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.int.parse("arg", "1."),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.int.parse("arg", ".1"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.int.parse("arg", "0.1"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.int.parse("arg", "asdas"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.int.parse("arg", "a1"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.int.parse("arg", "1a"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.int.parse("arg", "1 1"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.int.parse("arg", "x123"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
    });
  });

  describe("float type", () => {
    it("should work with integer decimal values", () => {
      assert.equal(types.float.parse("arg", "0"), 0);
      assert.equal(types.float.parse("arg", "1"), 1);
      assert.equal(types.float.parse("arg", "1123"), 1123);
      assert.equal(types.float.parse("arg", "05678"), 5678);
    });

    it("should work with non-integer decimal values", () => {
      assert.equal(types.float.parse("arg", "0.1"), 0.1);
      assert.equal(types.float.parse("arg", "123.123"), 123.123);
      assert.equal(types.float.parse("arg", ".123"), 0.123);
      assert.equal(types.float.parse("arg", "0."), 0);
    });

    it("should work with integer hex values", () => {
      assert.equal(types.float.parse("arg", "0x0"), 0);
      assert.equal(types.float.parse("arg", "0x1"), 1);
      assert.equal(types.float.parse("arg", "0xA"), 0xa);
      assert.equal(types.float.parse("arg", "0xa"), 0xa);
      assert.equal(types.float.parse("arg", "0x0a"), 0x0a);
    });

    it("should work with decimal scientific notation", () => {
      assert.equal(types.float.parse("arg", "1e0"), 1);
      assert.equal(types.float.parse("arg", "1e123"), 1e123);
      assert.equal(types.float.parse("arg", "12e0"), 12);
      assert.equal(types.float.parse("arg", "012e1"), 120);
      assert.equal(types.float.parse("arg", "0e12"), 0);
      assert.equal(types.float.parse("arg", "1.e123"), 1e123);
      assert.equal(types.float.parse("arg", "1.0e123"), 1e123);
      assert.equal(types.float.parse("arg", "1.0123e123"), 1.0123e123);
    });

    it("should fail with incorrect values", () => {
      expectBuidlerError(
        () => types.float.parse("arg", ""),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", "."),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", ".."),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", "1..1"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", "1.asd"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", "asd.123"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", "asdas"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", "a1"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", "1a"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", "1 1"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
      expectBuidlerError(
        () => types.float.parse("arg", "x123"),
        ERRORS.ARG_TYPE_INVALID_VALUE
      );
    });
  });
});
