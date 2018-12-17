import { assert } from "chai";

import { IEthereumProvider } from "../../../src/core/providers/ethereum";
import { WrappedProvider } from "../../../src/core/providers/wrapper";

import { MethodReturningProvider } from "./mocks";

class Wrapper extends WrappedProvider {
  constructor(provider: IEthereumProvider) {
    super(provider);
  }
}

describe("WrappedProvider", () => {
  let mockedProvider: MethodReturningProvider;
  let wrapper: WrappedProvider;

  beforeEach(() => {
    mockedProvider = new MethodReturningProvider();
    wrapper = new Wrapper(mockedProvider);
  });

  describe("Adding listener", () => {
    it("Should return the wrapper when adding listeners", () => {
      assert.equal(wrapper.addListener("a", () => {}), wrapper);
      assert.equal(wrapper.on("a", () => {}), wrapper);
      assert.equal(wrapper.once("a", () => {}), wrapper);
      assert.equal(wrapper.prependListener("a", () => {}), wrapper);
      assert.equal(wrapper.prependOnceListener("a", () => {}), wrapper);
    });

    it("Should work with addListener", () => {
      assert.equal(wrapper.listenerCount("a"), 0);

      const listener1 = () => {};
      wrapper.addListener("a", listener1);
      assert.equal(wrapper.listenerCount("a"), 1);

      assert.deepEqual(wrapper.listeners("a"), [listener1]);

      const listener2 = () => {};
      wrapper.addListener("a", listener2);
      assert.equal(wrapper.listenerCount("a"), 2);
      assert.deepEqual(wrapper.listeners("a"), [listener1, listener2]);
      assert.equal(wrapper.listenerCount("b"), 0);
    });

    it("Should work with on", () => {
      assert.equal(wrapper.listenerCount("a"), 0);

      const listener1 = () => {};
      wrapper.on("a", listener1);
      assert.equal(wrapper.listenerCount("a"), 1);

      assert.deepEqual(wrapper.listeners("a"), [listener1]);

      const listener2 = () => {};
      wrapper.on("a", listener2);
      assert.equal(wrapper.listenerCount("a"), 2);
      assert.deepEqual(wrapper.listeners("a"), [listener1, listener2]);
      assert.equal(wrapper.listenerCount("b"), 0);
    });

    it("Should work with once", () => {
      assert.equal(wrapper.listenerCount("a"), 0);

      const listener1 = () => {};
      wrapper.once("a", listener1);
      assert.equal(wrapper.listenerCount("a"), 1);

      assert.deepEqual(wrapper.listeners("a"), [listener1]);

      const listener2 = () => {};
      wrapper.once("a", listener2);
      assert.equal(wrapper.listenerCount("a"), 2);
      assert.deepEqual(wrapper.listeners("a"), [listener1, listener2]);
      assert.equal(wrapper.listenerCount("b"), 0);
    });

    it("Should work with prependListener", () => {
      assert.equal(wrapper.listenerCount("a"), 0);

      const listener1 = () => {};
      wrapper.prependListener("a", listener1);
      assert.equal(wrapper.listenerCount("a"), 1);

      assert.deepEqual(wrapper.listeners("a"), [listener1]);

      const listener2 = () => {};
      wrapper.prependListener("a", listener2);
      assert.equal(wrapper.listenerCount("a"), 2);
      assert.deepEqual(wrapper.listeners("a"), [listener2, listener1]);
      assert.equal(wrapper.listenerCount("b"), 0);
    });

    it("Should work with prependOnceListener", () => {
      assert.equal(wrapper.listenerCount("a"), 0);

      const listener1 = () => {};
      wrapper.prependOnceListener("a", listener1);
      assert.equal(wrapper.listenerCount("a"), 1);

      assert.deepEqual(wrapper.listeners("a"), [listener1]);

      const listener2 = () => {};
      wrapper.prependOnceListener("a", listener2);
      assert.equal(wrapper.listenerCount("a"), 2);
      assert.deepEqual(wrapper.listeners("a"), [listener2, listener1]);
      assert.equal(wrapper.listenerCount("b"), 0);
    });
  });

  describe("Removing listeners", () => {
    beforeEach(() => {
      wrapper.addListener("a", () => {});
      wrapper.addListener("a", () => {});
    });

    it("Should return the wrapper when removing listeners", () => {
      assert.equal(wrapper.removeListener("a", () => {}), wrapper);
      assert.equal(wrapper.removeAllListeners("a"), wrapper);
    });

    it("Should work with removeListener", () => {
      assert.equal(wrapper.listenerCount("a"), 2);
      wrapper.removeListener("a", () => {});
      assert.equal(wrapper.listenerCount("a"), 2);
    });

    it("Should work with removeAllListeners", () => {
      assert.equal(wrapper.listenerCount("a"), 2);
      wrapper.removeAllListeners("a");
      assert.equal(wrapper.listenerCount("a"), 0);
    });
  });

  describe("Event names", () => {
    it("Should have the same ones than the original provider", () => {
      assert.deepEqual(wrapper.eventNames(), mockedProvider.eventNames());
    });
  });

  describe("Max event listeners", () => {
    it("Should allow the same amount of listeners than the original provider", () => {
      assert.equal(wrapper.getMaxListeners(), mockedProvider.getMaxListeners());
    });

    it("Should be modifiable", () => {
      wrapper.setMaxListeners(123);
      assert.equal(wrapper.getMaxListeners(), 123);

      wrapper.setMaxListeners(4);
      assert.equal(wrapper.getMaxListeners(), 4);
    });
  });

  it("Should forward the send calls", async () => {
    const m = await wrapper.send("m");
    assert.equal(m, "m");
  });

  it("Should emit events correctly", async () => {
    const p = new Promise(resolve => {
      wrapper.once("a", () => resolve(true));

      wrapper.emit("a");
    });

    assert.isTrue(await p);
  });

  it("doesn't support symbols as on argument", () => {
    assert.throws(() => wrapper.on(Symbol.for("a"), () => {}));
  });
});
