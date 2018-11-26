import * as types from "../../src/core/argumentTypes";
import { assert, expect } from "chai";
import { ArgumentType } from "../../src/core/argumentTypes";
import { BuidlerError, ERRORS } from "../../src/core/errors";

function assertCorrectError(f: () => any) {
  expect(f)
    .to.throw(BuidlerError)
    .with.property("number", ERRORS.ARG_TYPE_INVALID_VALUE.number);
}

describe("argumentTypes", () => {
  it("should set the right name to all the argument types", () => {
    for (const typeName of Object.keys(types)) {
      const argumentTypesMap: { [name: string]: ArgumentType<any> } = types;
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
      assertCorrectError(() => types.boolean.parse("arg", "asd1"));
      assertCorrectError(() => types.boolean.parse("arg", "f"));
      assertCorrectError(() => types.boolean.parse("arg", "t"));
      assertCorrectError(() => types.boolean.parse("arg", "1"));
      assertCorrectError(() => types.boolean.parse("arg", "0"));
      assertCorrectError(() => types.boolean.parse("arg", ""));
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
      assertCorrectError(() => types.int.parse("arg", ""));
      assertCorrectError(() => types.int.parse("arg", "1."));
      assertCorrectError(() => types.int.parse("arg", ".1"));
      assertCorrectError(() => types.int.parse("arg", "0.1"));
      assertCorrectError(() => types.int.parse("arg", "asdas"));
      assertCorrectError(() => types.int.parse("arg", "a1"));
      assertCorrectError(() => types.int.parse("arg", "1a"));
      assertCorrectError(() => types.int.parse("arg", "1 1"));
      assertCorrectError(() => types.int.parse("arg", "x123"));
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
      assertCorrectError(() => types.float.parse("arg", ""));
      assertCorrectError(() => types.float.parse("arg", "."));
      assertCorrectError(() => types.float.parse("arg", ".."));
      assertCorrectError(() => types.float.parse("arg", "1..1"));
      assertCorrectError(() => types.float.parse("arg", "1.asd"));
      assertCorrectError(() => types.float.parse("arg", "asd.123"));
      assertCorrectError(() => types.float.parse("arg", "asdas"));
      assertCorrectError(() => types.float.parse("arg", "a1"));
      assertCorrectError(() => types.float.parse("arg", "1a"));
      assertCorrectError(() => types.float.parse("arg", "1 1"));
      assertCorrectError(() => types.float.parse("arg", "x123"));
    });
  });
});
