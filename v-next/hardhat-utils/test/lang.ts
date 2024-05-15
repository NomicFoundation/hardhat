import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expectTypeOf } from "expect-type";

import { deepClone, deepEqual } from "../src/lang.js";

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
  });

  describe("deepEqual", () => {
    it("Should compare objects correctly", async () => {
      const obj1 = { a: 1, b: 2, c: { d: 3 } };
      const obj2 = { a: 1, b: 2, c: { d: 3 } };
      const obj3 = { a: 1, b: 2, c: { d: 4 } };

      const areEqual = await deepEqual(obj1, obj2);
      const areNotEqual = await deepEqual(obj1, obj3);

      assert.ok(
        areEqual,
        `${JSON.stringify(obj1)} should equal ${JSON.stringify(obj2)}`,
      );
      assert.ok(
        !areNotEqual,
        `${JSON.stringify(obj1)} should not equal ${JSON.stringify(obj3)}`,
      );
    });

    it("Should compare arrays correctly", async () => {
      const arr1 = [1, 2, [3]];
      const arr2 = [1, 2, [3]];
      const arr3 = [1, 2, [4]];

      const areEqual = await deepEqual(arr1, arr2);
      const areNotEqual = await deepEqual(arr1, arr3);

      assert.ok(
        areEqual,
        `${JSON.stringify(arr1)} should equal ${JSON.stringify(arr2)}`,
      );
      assert.ok(
        !areNotEqual,
        `${JSON.stringify(arr1)} should not equal ${JSON.stringify(arr3)}`,
      );
    });

    it("Should compare strings correctly", async () => {
      const str1 = "hello";
      const str2 = "hello";
      const str3 = "world";

      const areEqual = await deepEqual(str1, str2);
      const areNotEqual = await deepEqual(str1, str3);

      assert.ok(areEqual, `${str1} should equal ${str2}`);
      assert.ok(!areNotEqual, `${str1} should not equal ${str3}`);
    });

    it("Should compare numbers correctly", async () => {
      const num1 = 42;
      const num2 = 42;
      const num3 = 43;

      const areEqual = await deepEqual(num1, num2);
      const areNotEqual = await deepEqual(num1, num3);

      assert.ok(areEqual, `${num1} should equal ${num2}`);
      assert.ok(!areNotEqual, `${num1} should not equal ${num3}`);
    });

    it("Should compare null values correctly", async () => {
      const n1 = null;
      const n2 = null;
      const n3 = undefined;

      const areEqual = await deepEqual(n1, n2);
      const areNotEqual = await deepEqual(n1, n3);

      assert.ok(areEqual, `${n1} should equal ${n2}`);
      assert.ok(!areNotEqual, `${n1} should not equal ${n3}`);
    });

    it("Should compare undefined values correctly", async () => {
      const u1 = undefined;
      const u2 = undefined;
      const u3 = null;

      const areEqual = await deepEqual(u1, u2);
      const areNotEqual = await deepEqual(u1, u3);

      assert.ok(areEqual, `${u1} should equal ${u2}`);
      assert.ok(!areNotEqual, `${u1} should not equal ${u3}`);
    });

    it("Should compare functions correctly", async () => {
      const fn1 = () => {};
      const fn2 = fn1;
      const fn3 = (arg1: any) => arg1;

      const areEqual = await deepEqual(fn1, fn2);
      const areNotEqual = await deepEqual(fn1, fn3);

      assert.ok(areEqual, `${fn1.toString()} should equal ${fn2.toString()}`);
      assert.ok(
        !areNotEqual,
        `${fn1.toString()} should not equal ${fn3.toString()}`,
      );
    });

    it("Should compare Dates correctly", async () => {
      const date1 = new Date();
      const date2 = new Date(date1.getTime());
      const date3 = new Date(date1.getTime() + 1);

      const areEqual = await deepEqual(date1, date2);
      const areNotEqual = await deepEqual(date1, date3);

      assert.ok(
        areEqual,
        `${date1.toString()} should equal ${date2.toString()}`,
      );
      assert.ok(
        !areNotEqual,
        `${date1.toString()} should not equal ${date3.toString()}`,
      );
    });

    it("Should compare Maps correctly", async () => {
      const map1 = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const map2 = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const map3 = new Map([
        ["a", 1],
        ["b", 3],
      ]);

      const areEqual = await deepEqual(map1, map2);
      const areNotEqual = await deepEqual(map1, map3);

      assert.ok(areEqual, `${map1.toString()} should equal ${map2.toString()}`);
      assert.ok(
        !areNotEqual,
        `${map1.toString()} should not equal ${map3.toString()}`,
      );
    });

    it("Should compare Sets correctly", async () => {
      const set1 = new Set([1, 2]);
      const set2 = new Set([1, 2]);
      const set3 = new Set([1, 3]);

      const areEqual = await deepEqual(set1, set2);
      const areNotEqual = await deepEqual(set1, set3);

      assert.ok(areEqual, `${set1.toString()} should equal ${set2.toString()}`);
      assert.ok(
        !areNotEqual,
        `${set1.toString()} should not equal ${set3.toString()}`,
      );
    });

    it("Should compare Buffers correctly", async () => {
      const buffer1 = Buffer.from("test");
      const buffer2 = Buffer.from("test");
      const buffer3 = Buffer.from("test2");

      const areEqual = await deepEqual(buffer1, buffer2);
      const areNotEqual = await deepEqual(buffer1, buffer3);

      assert.ok(
        areEqual,
        `${buffer1.toString()} should equal ${buffer2.toString()}`,
      );
      assert.ok(
        !areNotEqual,
        `${buffer1.toString()} should not equal ${buffer3.toString()}`,
      );
    });

    it("Should compare arguments correctly", async () => {
      function testFunc(_a: number, _b: string, _c: boolean) {
        return arguments;
      }
      const args1 = testFunc(1, "2", false);
      const args2 = testFunc(1, "2", false);
      const args3 = testFunc(1, "2", true);

      const areEqual = await deepEqual(args1, args2);
      const areNotEqual = await deepEqual(args1, args3);

      assert.ok(
        areEqual,
        `${args1.toString()} should equal ${args2.toString()}`,
      );
      assert.ok(
        !areNotEqual,
        `${args1.toString()} should not equal ${args3.toString()}`,
      );
    });

    it("Should compare Errors correctly", async () => {
      const error1 = new Error("test");
      const error2 = error1;
      const error3 = new Error("test2");

      const areEqual = await deepEqual(error1, error2);
      const areNotEqual = await deepEqual(error1, error3);

      assert.ok(
        areEqual,
        `${error1.toString()} should equal ${error2.toString()}`,
      );
      assert.ok(
        !areNotEqual,
        `${error1.toString()} should not equal ${error3.toString()}`,
      );
    });
  });
});
