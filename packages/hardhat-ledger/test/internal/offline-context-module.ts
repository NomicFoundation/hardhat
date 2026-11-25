import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ClearSignContextType } from "../../src/internal/dmk-imports.js";
import { offlineContextModule } from "../../src/internal/offline-context-module.js";

describe("offlineContextModule", () => {
  it("should find no clear signing context for a transaction", async () => {
    assert.deepEqual(await offlineContextModule.getContexts({}), []);
  });

  it("should find no clear signing context for a field", async () => {
    const context = await offlineContextModule.getFieldContext(
      {},
      ClearSignContextType.ETHEREUM_TOKEN,
    );

    assert.equal(context.type, ClearSignContextType.ERROR);
  });

  it("should find no filters for typed data", async () => {
    const context = await offlineContextModule.getTypedDataFilters(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the input is ignored
      {} as never,
    );

    assert.equal(context.type, "error");
  });

  it("should drop blind signing reports", async () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the input is ignored
    await offlineContextModule.report({} as never);
  });
});
