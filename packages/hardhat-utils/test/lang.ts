import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expectTypeOf } from "expect-type";

import { deepClone } from "../src/lang.js";

describe("lang", () => {
  describe("deepClone", () => {
    it("Should clone an object", async () => {
      const obj = { a: 1, b: 2, c: { d: 3 } };
      const clonedObj = await deepClone(obj);

      assert.deepEqual(clonedObj, obj);
      assert.notEqual(clonedObj, obj);
      assert.notEqual(clonedObj.c, obj.c);
      expectTypeOf(clonedObj).toEqualTypeOf<typeof obj>();
    });

    it("Should clone an array", async () => {
      const arr = [1, 2, [3]];
      const clonedArr = await deepClone(arr);

      assert.deepEqual(clonedArr, arr);
      assert.notEqual(clonedArr, arr);
      assert.notEqual(clonedArr[2], arr[2]);
      expectTypeOf(clonedArr).toEqualTypeOf<typeof arr>();
    });

    it("Should clone a string", async () => {
      const str = "hello";
      const clonedStr = await deepClone(str);

      assert.equal(clonedStr, str);
      expectTypeOf(clonedStr).toBeString();
    });

    it("Should clone a number", async () => {
      const num = 42;
      const clonedNum = await deepClone(num);

      assert.equal(clonedNum, num);
      expectTypeOf(clonedNum).toBeNumber();
    });

    it("Should clone null", async () => {
      const n = null;
      const clonedN = await deepClone(n);

      assert.equal(clonedN, n);
      expectTypeOf(clonedN).toBeNull();
    });

    it("Should clone undefined", async () => {
      const u = undefined;
      const clonedU = await deepClone(u);

      assert.equal(clonedU, u);
      expectTypeOf(clonedU).toBeUndefined();
    });

    it("Should reference a function", async () => {
      const fn = () => {};
      const clonedFn = await deepClone(fn);

      assert.equal(clonedFn, fn);
      expectTypeOf(clonedFn).toEqualTypeOf<typeof fn>();
    });

    it("Should clone a Date", async () => {
      const date = new Date();
      const clonedDate = await deepClone(date);

      assert.deepEqual(clonedDate, date);
      assert.notEqual(clonedDate, date);
      expectTypeOf(clonedDate).toEqualTypeOf<typeof date>();
    });

    it("Should clone a Map", async () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const clonedMap = await deepClone(map);

      assert.deepEqual(clonedMap, map);
      assert.notEqual(clonedMap, map);
      expectTypeOf(clonedMap).toEqualTypeOf<typeof map>();
    });

    it("Should clone a Set", async () => {
      const set = new Set([1, 2]);
      const clonedSet = await deepClone(set);

      assert.deepEqual(clonedSet, set);
      assert.notEqual(clonedSet, set);
      expectTypeOf(clonedSet).toEqualTypeOf<typeof set>();
    });

    it("Should clone a Buffer", async () => {
      const buffer = Buffer.from("test");
      const clonedBuffer = await deepClone(buffer);

      const expected: { [key: number]: number } = {};
      for (let i = 0; i < buffer.length; i++) {
        expected[i] = buffer[i] as number;
      }

      assert.deepEqual(clonedBuffer, expected);
      assert.notEqual(clonedBuffer, expected);
      expectTypeOf(clonedBuffer).toEqualTypeOf<Buffer>();
    });

    it("Should clone arguments to a normal object", async () => {
      function testFunc(_a: number, _b: string, _c: boolean) {
        return arguments;
      }
      const args = testFunc(1, "2", false);
      const clonedArgs = await deepClone(args);

      assert.deepEqual(clonedArgs, { "0": 1, "1": "2", "2": false });
      expectTypeOf(clonedArgs).toHaveProperty("0").toBeNumber();
      expectTypeOf(clonedArgs).toHaveProperty("1").toBeString();
      expectTypeOf(clonedArgs).toHaveProperty("2").toBeBoolean();
    });

    it("Should match JSON.parse(JSON.stringify(o)) for other types", async () => {
      const error = new Error("test");
      const clonedError = await deepClone(error);

      assert.deepEqual(clonedError, JSON.parse(JSON.stringify(error)));
      expectTypeOf(clonedError).toEqualTypeOf<typeof error>();
    });
  });
});
