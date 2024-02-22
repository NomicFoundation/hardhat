import { assert } from "chai";

import { inspect } from "util";
import { ERRORS } from "../../../src/internal/core/errors-list";
import { lazyFunction, lazyObject } from "../../../src/internal/util/lazy";
import { expectHardhatError } from "../../helpers/errors";

describe("lazy module", () => {
  describe("lazyObject", () => {
    it("shouldn't call the initializer function eagerly", () => {
      let called = false;
      lazyObject(() => {
        called = true;
        return {};
      });

      assert.isFalse(called);
    });

    it("should throw if the objectConstructor doesn't return an object", () => {
      const num = lazyObject(() => 123 as any);
      assert.throws(() => num.asd);
    });

    it("should call the initializer just once", () => {
      let numberOfCalls = 0;

      const obj = lazyObject(() => {
        numberOfCalls += 1;
        return {
          a: 1,
          b() {
            return this.a;
          },
        };
      });

      assert.strictEqual(numberOfCalls, 0);

      obj.a = 2;

      assert.strictEqual(numberOfCalls, 1);

      obj.b();

      assert.strictEqual(numberOfCalls, 1);

      delete (obj as any).a;

      assert.strictEqual(numberOfCalls, 1);

      (obj as any).asd = 123;

      assert.strictEqual(numberOfCalls, 1);
    });

    it("should be equivalent to the object returned by the initializer", () => {
      const expected = {
        a: 123,
        b: "asd",
        c: {
          d: [1, 2, 3],
          e: 1.3,
        },
        f: [3, { g: 1 }],
      };

      const obj = lazyObject(() => ({ ...expected }));

      assert.deepEqual(obj, expected);
    });

    it("doesn't support classes", () => {
      const obj = lazyObject(() => class {}) as any;

      expectHardhatError(
        () => (obj.asd = 123),
        ERRORS.GENERAL.UNSUPPORTED_OPERATION
      );
      expectHardhatError(() => obj.asd, ERRORS.GENERAL.UNSUPPORTED_OPERATION);
      assert.throws(() => new obj(), "obj is not a constructor");
    });

    it("doesn't support functions", () => {
      const obj = lazyObject(() => () => {}) as any;

      expectHardhatError(
        () => (obj.asd = 123),
        ERRORS.GENERAL.UNSUPPORTED_OPERATION
      );
      expectHardhatError(() => obj.asd, ERRORS.GENERAL.UNSUPPORTED_OPERATION);

      assert.throws(() => obj(), "obj is not a function");
    });

    it("should trap defineProperty correctly", () => {
      const obj = lazyObject(() => ({})) as any;
      obj.asd = 123;

      assert.strictEqual(obj.asd, 123);
    });

    it("should trap deleteProperty correctly", () => {
      const obj = lazyObject(() => ({ a: 1 }));
      delete (obj as any).a;

      assert.isUndefined(obj.a);
    });

    it("should trap get correctly", () => {
      const obj = lazyObject(() => ({ a: 1 }));
      assert.strictEqual(obj.a, 1);
    });

    it("should trap getOwnPropertyDescriptor correctly", () => {
      const obj = lazyObject(() => ({ a: 1 }));

      assert.deepEqual(Object.getOwnPropertyDescriptor(obj, "a"), {
        value: 1,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    });

    it("should trap getPrototypeOf correctly", () => {
      const proto = {};
      const obj = lazyObject(() => Object.create(proto));

      assert.strictEqual(Object.getPrototypeOf(obj), proto);
    });

    it("should trap has correctly", () => {
      const proto = { a: 1 };
      const obj = lazyObject(() => {
        const v = Object.create(proto);
        v.b = 1;

        return v;
      });

      assert.isTrue("a" in obj);
      assert.isTrue("b" in obj);
      assert.isFalse("c" in obj);
    });

    it("should trap isExtensible correctly", () => {
      const obj = lazyObject(() => {
        const v = {};
        Object.preventExtensions(v);

        return v;
      });

      assert.isFalse(Object.isExtensible(obj));

      const obj2 = lazyObject(() => ({}));
      assert.isTrue(Object.isExtensible(obj2));
    });

    it("should trap ownKeys correctly", () => {
      const proto = { a: 1 };
      const obj = lazyObject(() => {
        const v = Object.create(proto);
        v.b = 1;

        return v;
      });

      obj.c = 123;

      assert.deepEqual(Object.getOwnPropertyNames(obj), ["b", "c"]);
    });

    it("should trap preventExtensions correctly", () => {
      const obj = lazyObject(() => ({}));
      Object.preventExtensions(obj);

      assert.isFalse(Object.isExtensible(obj));
    });

    it("should trap set correctly", () => {
      const obj = lazyObject(() => ({})) as any;
      obj.asd = 123;

      assert.deepEqual(Object.getOwnPropertyNames(obj), ["asd"]);
      assert.strictEqual(obj.asd, 123);
    });

    it("should trap setPrototypeOf correctly", () => {
      const proto = Object.create(null);
      const obj = lazyObject(() => Object.create(proto));
      assert.strictEqual(Object.getPrototypeOf(obj), proto);
      assert.isUndefined(obj.a);

      const newProto = { a: 123 };
      Object.setPrototypeOf(obj, newProto);
      assert.strictEqual(Object.getPrototypeOf(obj), newProto);
      assert.strictEqual(obj.a, 123);
    });

    it("should throw if it's used to create an object without prototype", () => {
      const obj = lazyObject(() => Object.create(null));
      expectHardhatError(() => obj.asd, ERRORS.GENERAL.UNSUPPORTED_OPERATION);
    });

    it("should inspect up to the appropriate depth", () => {
      const realObj = { b: 3, c: { d: { e: 4 } } };
      const lazyObj = lazyObject(() => realObj);
      const depth = 1;
      assert.strictEqual(inspect(realObj, { depth }), inspect(lazyObj, { depth }));
    });

    it("should support inspecting circular objects", () => {
      class Foo {
        public val: any;
        constructor(baz: any) {
          this.val = baz;
        }
      }
      const myLazyObj: any = {};
      myLazyObj.foo = lazyObject(() => new Foo(myLazyObj));
      // The custom inspect will not pick up on the circularity,
      // but it should at least stop at the default depth (2)
      // instead of recursing infinitely.
      assert.strictEqual("{ foo: Foo { val: { foo: [Foo] } } }", inspect(myLazyObj));
    });
  });
});

describe("lazy import", () => {
  it("should work with a function module", () => {
    const lazyF = lazyFunction(() => () => ({ a: 1, b: 2 }));
    assert.deepEqual(lazyF(), { a: 1, b: 2 });
  });

  it("should work with a class module", () => {
    const lazyC = lazyFunction(
      () =>
        class {
          public a: number;
          public b: number;
          constructor() {
            this.a = 1;
            this.b = 2;
          }
        }
    );

    assert.deepEqual(new lazyC(), { a: 1, b: 2 });
  });

  it("should inspect up to the appropriate depth", () => {
    class RealClass {
      public a: number;
      public b: number;
      constructor() {
        this.a = 1;
        this.b = 2;
      }
    }
    (RealClass as any).dummyProperty = { b: 3, c: { d: { e: 4 } } };
    const lazyC = lazyFunction(() => RealClass);
    const depth = 1;
    assert.strictEqual(inspect(RealClass, { depth }), inspect(lazyC, { depth }));
  });
});
