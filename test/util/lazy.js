const assert = require("chai").assert;
const { lazyObject } = require("../../src/util/lazy");

describe("lazy module", () => {
  describe("lazyObject", () => {
    it("shouldn't call the initializer function eagerly", () => {
      let called = false;
      lazyObject(() => (called = true));
      assert.isFalse(called);
    });

    it("should call the initializer just once", () => {
      let numberOfCalls = 0;

      const obj = lazyObject(() => {
        numberOfCalls += 1;
        return {
          a: 1,
          b() {
            return this.a;
          }
        };
      });

      assert.equal(numberOfCalls, 0);

      obj.a = 2;

      assert.equal(numberOfCalls, 1);

      obj.b();

      assert.equal(numberOfCalls, 1);

      delete obj.a;

      assert.equal(numberOfCalls, 1);

      obj.asd = 123;

      assert.equal(numberOfCalls, 1);
    });

    it("should be equivalent to the object returned by the initializer", () => {
      const expected = {
        a: 123,
        b: "asd",
        c: {
          d: [1, 2, 3],
          e: 1.3
        },
        f: [3, { g: 1 }]
      };

      const obj = lazyObject(() => ({ ...expected }));

      assert.deepEqual(obj, expected);
    });

    it("should be possible to create the lazy object if it's a class", () => {
      const obj = (() =>
        lazyObject(
          () =>
            class {
              constructor() {
                this.initialized = true;
              }
            }
        ))();

      const o = new obj();
      assert.isTrue(o.initialized);
    });

    it("should be possible to call the lazy object if it's a function", () => {
      let called = false;

      const obj = lazyObject(() => () => (called = true));
      obj();

      assert.isTrue(called);
    });
  });
});
