import { assert } from "chai";

import { wrapSend } from "../../../src/core/providers/wrapper";

import { MethodReturningProvider, ParamsReturningProvider } from "./mocks";

describe("wrapSend", () => {
  let methodReturningProvider: MethodReturningProvider;
  let paramsReturningProvider: ParamsReturningProvider;

  before(() => {
    methodReturningProvider = new MethodReturningProvider();
    paramsReturningProvider = new ParamsReturningProvider();
  });

  it("Should forward everything except for send", async () => {
    const wrapped = wrapSend(methodReturningProvider, async () => 123);

    wrapped.addListener("a", () => {});
    assert.equal(methodReturningProvider.listenerCount("a"), 1);

    wrapped.setMaxListeners(1234);
    assert.equal(methodReturningProvider.getMaxListeners(), 1234);
  });

  it("Should forward send", async () => {
    const wrapped = wrapSend(methodReturningProvider, async () => 123);
    assert.equal(await wrapped.send("asd"), 123);
  });

  it("Should always forward an array of params", async () => {
    const wrapped = wrapSend(
      methodReturningProvider,
      async (name, params) => params
    );

    assert.isDefined(await wrapped.send("asd"));
  });

  it("Should deep clone the params before forwarding", async () => {
    const sentParams = [{}];

    const wrapped = wrapSend(paramsReturningProvider, async (name, params) => {
      params[0].asd = true;
      params.push(123);

      return params;
    });

    const returnedParams = await wrapped.send("a", sentParams);

    assert.notEqual(returnedParams, sentParams);
    assert.deepEqual(returnedParams, [{ asd: true }, 123]);
    assert.deepEqual(sentParams, [{}]);
  });

  it("Should return the wrapped object on subscription and unsubscription", () => {
    const wrapped = wrapSend(
      methodReturningProvider,
      async (name, params) => params
    );

    assert.equal(wrapped.on("a", () => {}), wrapped);
    assert.equal(wrapped.once("a", () => {}), wrapped);
    assert.equal(wrapped.addListener("a", () => {}), wrapped);
    assert.equal(wrapped.prependListener("a", () => {}), wrapped);
    assert.equal(wrapped.prependOnceListener("a", () => {}), wrapped);
    assert.equal(wrapped.removeListener("a", () => {}), wrapped);
    assert.equal(wrapped.removeAllListeners("a"), wrapped);
  });

  it("Should return undefined if the property is not present in the original provider", () => {
    const wrapped = wrapSend(
      methodReturningProvider,
      async (name, params) => params
    );

    assert.isUndefined((wrapped as any).asd);
  });

  it("Shouldn't affect functions that don't return `this`", () => {
    const wrapped = wrapSend(
      methodReturningProvider,
      async (name, params) => params
    );

    wrapped.setMaxListeners(100);
    assert.equal(wrapped.getMaxListeners(), 100);
  });
});
