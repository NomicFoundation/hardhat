import { assert } from "chai";
import { EventEmitter } from "events";

import { EventEmitterWrapper } from "../../../src/internal/util/event-emitter";

describe("EventEmitterWrapper", function () {
  it("Should have all the members of EventEmitter except private ones and 'domain'", function () {
    const emitter: any = new EventEmitter();
    const wrapper: any = new EventEmitterWrapper(emitter);

    for (const key in emitter) {
      if (key.startsWith("_") || key === "domain") {
        continue;
      }

      assert.typeOf(wrapper[key], typeof emitter[key]);
    }
  });

  describe("Event emitter methods", function () {
    let emitter: EventEmitter;
    let wrapper: EventEmitterWrapper;
    let accessedMembers: string[];

    beforeEach(function () {
      accessedMembers = [];
      emitter = new EventEmitter();
      wrapper = new EventEmitterWrapper(
        new Proxy(emitter, {
          get(target, p: PropertyKey, receiver: any): any {
            assert.typeOf(p, "string");
            accessedMembers.push(p as string);
            return Reflect.get(target, p, receiver);
          },
        })
      );
    });

    function assertForwardAndReturnThis(call: () => any, func: string) {
      const ret = call();
      // The emitter may call other things internally, but we want to make sure
      // that the first thing called is our function under test
      assert.strictEqual(accessedMembers[0], func);
      assert.strictEqual(ret, wrapper);
    }

    describe("Method addListener", function () {
      it("Should forward it to the emitter and return the wrapper", function () {
        assertForwardAndReturnThis(
          () => wrapper.addListener("asd", () => {}),
          "addListener"
        );
      });
    });

    describe("Method on", function () {
      it("Should forward it to the emitter and return the wrapper", function () {
        assertForwardAndReturnThis(() => wrapper.on("asd", () => {}), "on");
      });
    });

    describe("Method once", function () {
      it("Should forward it to the emitter and return the wrapper", function () {
        assertForwardAndReturnThis(() => wrapper.once("asd", () => {}), "once");
      });
    });

    describe("Method prependListener", function () {
      it("Should forward it to the emitter and return the wrapper", function () {
        assertForwardAndReturnThis(
          () => wrapper.prependListener("asd", () => {}),
          "prependListener"
        );
      });
    });

    describe("Method prependOnceListener", function () {
      it("Should forward it to the emitter and return the wrapper", function () {
        assertForwardAndReturnThis(
          () => wrapper.prependOnceListener("asd", () => {}),
          "prependOnceListener"
        );
      });
    });

    describe("Method removeListener", function () {
      it("Should forward it to the emitter and return the wrapper", function () {
        assertForwardAndReturnThis(
          () => wrapper.removeListener("asd", () => {}),
          "removeListener"
        );
      });
    });

    describe("Method off", function () {
      it("Should forward it to the emitter and return the wrapper", function () {
        assertForwardAndReturnThis(() => wrapper.off("asd", () => {}), "off");
      });
    });

    describe("Method removeAllListeners", function () {
      it("Should forward it to the emitter and return the wrapper", function () {
        assertForwardAndReturnThis(
          () => wrapper.removeAllListeners("asd"),
          "removeAllListeners"
        );
      });
    });

    describe("Method setMaxListeners", function () {
      it("Should forward it to the emitter and return the wrapper", function () {
        assertForwardAndReturnThis(
          () => wrapper.setMaxListeners(123),
          "setMaxListeners"
        );

        assert.strictEqual(emitter.getMaxListeners(), 123);
      });
    });

    describe("Method getMaxListeners", function () {
      it("Should return the same value as the emitter", function () {
        emitter.setMaxListeners(12);
        assert.strictEqual(emitter.getMaxListeners(), 12);
        assert.strictEqual(wrapper.getMaxListeners(), emitter.getMaxListeners());
      });
    });

    describe("Method listeners", function () {
      it("Should return the same value as the emitter", function () {
        const listener1 = () => {};
        emitter.on("a", listener1);
        const listeners = wrapper.listeners("a");
        assert.lengthOf(listeners, 1);
        assert.strictEqual(listeners[0], listener1);
      });
    });

    describe("Method rawListeners", function () {
      it("Should return the same value as the emitter", function () {
        const listener1 = () => {};
        emitter.once("a", listener1);
        emitter.on("a", listener1);

        const rawListeners = wrapper.rawListeners("a");
        assert.lengthOf(rawListeners, 2);
        assert.notEqual(rawListeners[0], listener1);
        assert.strictEqual(rawListeners[1], listener1);
      });
    });

    describe("Method emit", function () {
      it("Should emit if the wrapped object emits", function () {
        let emitted: boolean = false;
        wrapper.on("e", () => {
          emitted = true;
        });

        emitter.emit("e");

        assert.isTrue(emitted);
      });

      it("The wrapped object should emit if the wrapper does", function () {
        let emitted: boolean = false;
        emitter.on("e", () => {
          emitted = true;
        });

        wrapper.emit("e");

        assert.isTrue(emitted);
      });
    });

    describe("Method eventNames", function () {
      it("Should return the same value as the emitter", function () {
        emitter.on("a", () => {});
        emitter.on("b", () => {});

        const names = wrapper.eventNames();
        assert.deepEqual(names, ["a", "b"]);
      });
    });

    describe("Method listenerCount", function () {
      it("Should return the same value as the emitter", function () {
        emitter.on("a", () => {});
        emitter.on("b", () => {});
        emitter.on("b", () => {});

        assert.strictEqual(emitter.listenerCount("a"), 1);
        assert.strictEqual(emitter.listenerCount("b"), 2);
        assert.strictEqual(wrapper.listenerCount("a"), emitter.listenerCount("a"));
        assert.strictEqual(wrapper.listenerCount("b"), emitter.listenerCount("b"));
      });
    });
  });
});
