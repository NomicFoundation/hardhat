import { assert } from "chai";

import { wrapSend } from "../../../../src/internal/core/providers/wrapper";

import { MockedProvider } from "./mocks";

describe("wrapSend", () => {
  let mockedProvider: MockedProvider;

  beforeEach(() => {
    mockedProvider = new MockedProvider();
  });

  it("Should forward everything except for send", async () => {
    const wrapped = wrapSend(mockedProvider, async () => 123);

    wrapped.on("notification", () => {});
    assert.equal(mockedProvider.listenerCount("notification"), 1);
  });

  it("Should forward send", async () => {
    const wrapped = wrapSend(mockedProvider, async () => 123);
    assert.equal(await wrapped.send("asd"), 123);
  });

  it("Should always forward an array of params", async () => {
    const wrapped = wrapSend(mockedProvider, async (name, params) => params);

    assert.isDefined(await wrapped.send("asd"));
  });

  it("Should deep clone the params before forwarding", async () => {
    const sentParams = [{}];

    const wrapped = wrapSend(mockedProvider, async (name, params) => {
      params[0].asd = true;
      params.push(123);

      return params;
    });

    const returnedParams = await wrapped.send("notification", sentParams);

    assert.notEqual(returnedParams, sentParams);
    assert.deepEqual(returnedParams, [{ asd: true }, 123]);
    assert.deepEqual(sentParams, [{}]);
  });

  it("Should return the wrapped object on subscription and unsubscription", () => {
    const wrapped = wrapSend(mockedProvider, async (name, params) => params);

    assert.equal(
      wrapped.on("notification", () => {}),
      wrapped
    );
    assert.equal(
      wrapped.removeListener("notification", () => {}),
      wrapped
    );
    assert.equal(wrapped.removeAllListeners("notification"), wrapped);
  });

  it("Should return undefined if the property is not present in the original provider", () => {
    const wrapped = wrapSend(mockedProvider, async (name, params) => params);

    assert.isUndefined((wrapped as any).asd);
  });
});
