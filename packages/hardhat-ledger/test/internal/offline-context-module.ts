import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { ClearSignContextType } from "../../src/internal/dmk-imports.js";
import { offlineContextModule } from "../../src/internal/offline-context-module.js";

describe("offlineContextModule", () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  beforeEach(() => {
    fetchCalls = 0;

    globalThis.fetch = async () => {
      fetchCalls++;

      throw new Error("The context module must not use the network");
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should provide no clear-signing context", async () => {
    assert.deepEqual(await offlineContextModule.getContexts({}), []);

    const fieldContext = await offlineContextModule.getFieldContext(
      {},
      ClearSignContextType.ETHEREUM_TOKEN,
    );

    assert.equal(fieldContext.type, ClearSignContextType.ERROR);

    const filters = await offlineContextModule.getTypedDataFilters(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The module ignores its input
      {} as Parameters<typeof offlineContextModule.getTypedDataFilters>[0],
    );

    assert.equal(filters.type, "error");
    assert.equal(fetchCalls, 0);
  });

  it("should not report signing events", async () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Only the call matters here
    await offlineContextModule.report({} as any);

    assert.equal(fetchCalls, 0);
  });
});
