import { assert } from "chai";

import { createUpdatableTargetProxy } from "../src/internal/updatable-target-proxy";

describe("updatable target proxy", function () {
  it("should proxy properties", function () {
    const o: any = {
      a: 1,
      getA() {
        return this.a;
      },
      b: {},
      getB() {
        return this.b;
      },
    };

    const { proxy } = createUpdatableTargetProxy(o);

    assert.equal(proxy.a, 1);
    assert.equal(proxy.getA(), 1);
    assert.equal(proxy.b, o.b);
    assert.equal(proxy.getB(), o.b);
  });

  it("should let set a new target", function () {
    const o1: any = {
      a: 1,
      getA() {
        return this.a;
      },
      b: {},
      getB() {
        return this.b;
      },
    };

    const o2: any = {
      a: 2,
      getA() {
        return this.a;
      },
      b: {},
      getB() {
        return this.b;
      },
    };

    const { proxy, setTarget } = createUpdatableTargetProxy(o1);

    assert.equal(proxy.a, 1);

    setTarget(o2);

    assert.equal(proxy.a, 2);
    assert.equal(proxy.getA(), 2);
    assert.equal(proxy.b, o2.b);
    assert.equal(proxy.getB(), o2.b);
  });

  it("shouldn't let you modify the proxied object", function () {
    const o: any = {
      a: 1,
    };

    const { proxy } = createUpdatableTargetProxy(o);

    assert.throws(() => {
      proxy.a = 2;
    });
    assert.throws(() => {
      delete proxy.a;
    });
    assert.throws(() => {
      Object.defineProperty(proxy, "b", {});
    });
    assert.throws(() => {
      Object.setPrototypeOf(proxy, {});
    });
  });

  it("should let you call methods that modify the object", function () {
    const o = {
      a: 1,
      inc() {
        this.a++;
      },
    };

    const { proxy } = createUpdatableTargetProxy(o);

    assert.equal(proxy.a, 1);
    proxy.inc();
    assert.equal(proxy.a, 2);
  });

  it("should trap getOwnPropertyDescriptor correctly", () => {
    const o = { a: 1 };
    const { proxy, setTarget } = createUpdatableTargetProxy(o);

    assert.deepEqual(Object.getOwnPropertyDescriptor(proxy, "a"), {
      value: 1,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    const o2 = { a: 2, b: 3 };
    setTarget(o2);

    assert.deepEqual(Object.getOwnPropertyDescriptor(proxy, "a"), {
      value: 2,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    assert.deepEqual(Object.getOwnPropertyDescriptor(proxy, "b"), {
      value: 3,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  it("should trap getPrototypeOf correctly", () => {
    const proto = {};
    const o = Object.create(proto);

    const { proxy, setTarget } = createUpdatableTargetProxy(o);

    assert.equal(Object.getPrototypeOf(proxy), proto);

    const proto2 = {};
    const o2 = Object.create(proto2);

    setTarget(o2);
    assert.equal(Object.getPrototypeOf(proxy), proto2);
  });

  it("should trap has correctly", () => {
    const proto = { a: 1 };
    const o = Object.create(proto);
    o.b = 2;

    const { proxy, setTarget } = createUpdatableTargetProxy(o);

    assert.isTrue("a" in proxy);
    assert.isTrue("b" in proxy);
    assert.isFalse("c" in proxy);

    const proto2 = { a: 2 };
    const o2 = Object.create(proto2);
    o2.b = 4;
    o2.c = 6;

    setTarget(o2);
    assert.isTrue("a" in proxy);
    assert.isTrue("b" in proxy);
    assert.isTrue("c" in proxy);
    assert.isFalse("d" in proxy);
  });

  it("should return isExtensible correctly", () => {
    const o: any = {};
    Object.preventExtensions(o);

    const { proxy, setTarget } = createUpdatableTargetProxy(o);

    assert.isFalse(Object.isExtensible(proxy));

    // if the proxy is initially not extensible, then it can't be made
    // extensible afterwards
    setTarget({});
    assert.isFalse(Object.isExtensible(proxy));
  });

  it("should trap ownKeys correctly", () => {
    const proto = { a: 1 };
    const o: any = Object.create(proto);
    o.b = 1;

    const { proxy, setTarget } = createUpdatableTargetProxy(o);
    assert.deepEqual(Object.getOwnPropertyNames(proxy), ["b"]);

    const proto2 = { c: 1 };
    const o2: any = Object.create(proto2);
    o2.d = 1;
    setTarget(o2);
    assert.deepEqual(Object.getOwnPropertyNames(proxy), ["d"]);
  });

  it("should trap preventExtensions correctly", () => {
    const o: any = {};

    const { proxy } = createUpdatableTargetProxy(o);
    assert.isTrue(Object.isExtensible(proxy));

    Object.preventExtensions(proxy);
    assert.isFalse(Object.isExtensible(proxy));
  });
});
