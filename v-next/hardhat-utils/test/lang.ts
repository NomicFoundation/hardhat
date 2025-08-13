import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expectTypeOf } from "expect-type";

import {
  bindAllMethods,
  deepClone,
  deepEqual,
  deepMerge,
  isObject,
  sleep,
} from "../src/lang.js";

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
        expected[i] = buffer[i];
      }

      assert.deepEqual(clonedBuffer, expected);
      assert.notEqual(clonedBuffer, expected);
      expectTypeOf(clonedBuffer).toEqualTypeOf<Buffer<ArrayBuffer>>();
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

  describe("deepMerge", () => {
    it("Should overwrite a nested object with a primitive value from the source", () => {
      const target = { a: { b: 1 } };
      const source = { a: 1 };

      const result = deepMerge(target, source);

      assert.deepEqual(result, { a: 1 });
    });

    it("Should merge multiple top-level keys", () => {
      const target = { x: 1, y: { z: 2 } };
      const source = { y: { w: 3 }, k: 4 };

      const result = deepMerge(target, source);

      assert.deepEqual(result, { x: 1, y: { z: 2, w: 3 }, k: 4 });
    });

    it("Should deeply merge nested objects when keys do not overlap", () => {
      const target = { a: { b: 1 } };
      const source = { a: { c: 2 } };

      const result = deepMerge(target, source);

      assert.deepEqual(result, { a: { b: 1, c: 2 } });
    });

    it("Should overwrite matching nested keys with values from the source", () => {
      const target = { a: { b: 1 } };
      const source = { a: { b: 2 } };

      const result = deepMerge(target, source);

      assert.deepEqual(result, { a: { b: 2 } });
    });

    it("Should merge deeply nested objects", () => {
      const target = { a: { b: { c: 1 } } };
      const source = { a: { b: { d: 2 } } };

      const result = deepMerge(target, source);

      assert.deepEqual(result, { a: { b: { c: 1, d: 2 } } });
    });

    it("Should merge nested objects and add new root-level keys", () => {
      const target = { a: { b: 1 } };
      const source = { a: { b: 2 }, d: 4 };

      const result = deepMerge(target, source);

      assert.deepEqual(result, { a: { b: 2 }, d: 4 });
    });

    it("Should replace arrays in nested objects instead of merging them", () => {
      const target = { a: { b: [1, 2] } };
      const source = { a: { b: [3, 4] } };

      const result = deepMerge(target, source);

      assert.deepEqual(result, { a: { b: [3, 4] } });
    });

    it("Should preserve existing arrays and add new keys with array values in nested objects", () => {
      const target = { a: { b: [1, 2] } };
      const source = { a: { c: [3, 4] } };

      const result = deepMerge(target, source);

      assert.deepEqual(result, { a: { b: [1, 2], c: [3, 4] } });
    });

    it("Should replace arrays of objects in nested structures with those from the source", () => {
      const target = {
        a: {
          b: [{ a: 1 }, { c: 3, d: 4 }],
        },
      };
      const source = {
        a: {
          b: [{ a: 11 }, { c: { cc: 1 }, d: "value" }],
        },
      };

      const result = deepMerge(target, source);

      assert.deepEqual(result, {
        a: {
          b: [{ a: 11 }, { c: { cc: 1 }, d: "value" }],
        },
      });
    });

    it("Should overwrite with null values from source", () => {
      const target = { a: { b: 1 } };
      const source = { a: null };

      const result = deepMerge(target, source);

      assert.deepEqual(result, { a: null });
    });

    it("Should overwrite a root-level function and preserve other properties", () => {
      const target = {
        fn: () => "from target",
        a: 1,
      };

      const source = {
        fn: () => "from source",
        b: 2,
      };

      const result = deepMerge(target, source);

      assert.equal(result.fn(), source.fn());
      assert.equal(result.a, 1);
      assert.equal(result.b, 2);
    });

    it("Should overwrite a nested object function with a function from the source", () => {
      const target = {
        nested: {
          fn: () => "from target",
          a: 1,
        },
      };

      const source = {
        nested: {
          fn: () => "from source",
          b: 2,
        },
      };

      const result = deepMerge(target, source);

      assert.equal(result.nested.fn(), source.nested.fn());
      assert.equal(result.nested.a, 1);
      assert.equal(result.nested.b, 2);
    });

    it("Should merge symbol-keyed properties from the source into the target", () => {
      const symA = Symbol("a");
      const symB = Symbol("b");

      const target = {
        [symA]: "value from target",
      };

      const source = {
        [symA]: "value from source",
        [symB]: "another value from source",
      };

      const result = deepMerge(target, source);

      assert.equal(result[symA], "value from source");
      assert.equal(result[symB], "another value from source");
    });

    it("Should merge symbol-keyed properties nested inside objects", () => {
      const symA = Symbol("a");
      const symB = Symbol("b");

      const target = {
        nested: {
          [symA]: "target A",
          common: "target common",
        },
      };

      const source = {
        nested: {
          [symA]: "source A",
          [symB]: "source B",
        },
      };

      const result = deepMerge(target, source);

      assert.equal(result.nested[symA], "source A");
      assert.equal(result.nested[symB], "source B");
      assert.equal(result.nested.common, "target common");
    });

    it("Should overwrite class instances instead of merging them", () => {
      class Person {
        constructor(public name: string) {}
      }

      const target = {
        person: new Person("Alice"),
        role: "admin",
      };

      const source = {
        person: new Person("Bob"),
        active: true,
      };

      const result = deepMerge(target, source);

      assert.equal(result.person.constructor, Person);
      assert.equal(result.person.name, "Bob"); // source overrides target
      assert.equal(result.role, "admin"); // preserved from target
      assert.equal(result.active, true); // added from source
    });
  });

  describe("isObject", () => {
    it("Should return true for objects", () => {
      assert.ok(isObject({}), "{} is an object, but isObject returned false");
      assert.ok(
        isObject({ a: 1 }),
        "{ a: 1 } is an object, but isObject returned false",
      );
      assert.ok(
        isObject(new Date()),
        "new Date() is an object, but isObject returned false",
      );
      assert.ok(
        isObject(new Map()),
        "new Map() is an object, but isObject returned false",
      );
      assert.ok(
        isObject(new Set()),
        "new Set() is an object, but isObject returned false",
      );
      assert.ok(
        isObject(new Error()),
        "new Error() is an object, but isObject returned false",
      );
    });

    it("Should return false for non-objects", () => {
      assert.ok(
        !isObject(null),
        "null is not an object, but isObject returned true",
      );
      assert.ok(
        !isObject(undefined),
        "undefined is not an object, but isObject returned true",
      );
      assert.ok(
        !isObject([]),
        "[] is not an object, but isObject returned true",
      );
      assert.ok(
        !isObject(""),
        "'' is not an object, but isObject returned true",
      );
      assert.ok(
        !isObject(42),
        "42 is not an object, but isObject returned true",
      );
      assert.ok(
        !isObject(true),
        "true is not an object, but isObject returned true",
      );
    });
  });

  describe("sleep", () => {
    // The precision we'd use for the tests, in milliseconds.
    // This means that if an expected values is +/- within the
    // TESTS_PRECISION_MS, we consider it to have passed.
    const TESTS_PRECISION_MS = 30;

    async function assertSleep(
      sleepSeconds: number,
      { minMillis, maxMillis }: { minMillis?: number; maxMillis?: number } = {},
    ) {
      const start = Date.now();
      await sleep(sleepSeconds);
      const diff = Date.now() - start;

      if (maxMillis !== undefined) {
        assert.ok(
          diff <= maxMillis + TESTS_PRECISION_MS,
          `sleep exceeded the expected ${maxMillis} milliseconds (comparison precision: ${TESTS_PRECISION_MS} ms). It slept for ${diff} milliseconds.`,
        );
      }

      if (minMillis !== undefined) {
        assert.ok(
          diff >= minMillis - TESTS_PRECISION_MS,
          `sleep did not wait for the expected ${minMillis} milliseconds (comparison precision: ${TESTS_PRECISION_MS} ms). It slept for ${diff} milliseconds.`,
        );
      }
    }

    it("should wait for the specified time", async () => {
      await assertSleep(1, { minMillis: 1000 });
    });

    it("should handle zero delay", async () => {
      await assertSleep(0, { maxMillis: 30 });
    });

    it("should handle negative delay", async () => {
      await assertSleep(-1, { maxMillis: 30 });
    });

    it("should handle non-integer delay", async () => {
      await assertSleep(1.5, { minMillis: 1500 });
    });
  });

  describe("bindAllMethods", () => {
    it("Should work with objects", () => {
      const obj = {
        foo() {
          return this.bar();
        },
        bar() {
          return "bar";
        },
      };

      assert.throws(() => {
        const foo = obj.foo;
        foo();
      });

      bindAllMethods(obj);
      const boundFoo = obj.foo;
      assert.equal(boundFoo(), "bar");
    });

    it("Should work with instances of classes", () => {
      class FooBar {
        public foo() {
          return this.bar();
        }
        public bar() {
          return "bar";
        }
      }

      const obj = new FooBar();

      assert.throws(() => {
        const foo = obj.foo;
        foo();
      });

      bindAllMethods(obj);
      const boundFoo = obj.foo;
      assert.equal(boundFoo(), "bar");
    });

    it("Should work with instances of classes, from its constructor", () => {
      class FooBar {
        constructor() {
          bindAllMethods(this);
        }
        public foo() {
          return this.bar();
        }
        public bar() {
          return "bar";
        }
      }

      const obj = new FooBar();
      const foo = obj.foo;
      assert.equal(foo(), "bar");
    });

    it("Should work with instances of classes with their own properties", () => {
      class FooBar {
        public foo() {
          return this.bar();
        }
        public bar() {
          return "bar";
        }
      }

      const obj = new FooBar();
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
        We do this to add its own property. */
      const objAsAny = obj as any;
      objAsAny.baz = function () {
        return this.foo();
      };

      assert.throws(() => {
        const baz = objAsAny.baz;
        baz();
      });

      bindAllMethods(obj);

      const boundBaz = objAsAny.baz;
      assert.equal(boundBaz(), "bar");
    });

    it("Should work with objects without a prototype", () => {
      const obj = Object.create(null);
      obj.foo = function () {
        return this.bar();
      };
      obj.bar = function () {
        return "bar";
      };

      assert.throws(() => {
        const foo = obj.foo;
        foo();
      });

      bindAllMethods(obj);
      const boundFoo = obj.foo;
      assert.equal(boundFoo(), "bar");
    });
  });
});
