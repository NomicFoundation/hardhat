import type { ContextModule } from "./dmk-imports.js";

import { ClearSignContextType } from "./dmk-imports.js";

/**
 * A context module that never contacts Ledger's servers.
 *
 * The signer kit's default context module fetches clear-signing metadata
 * from Ledger and reports every transaction and typed-data signature to
 * Ledger's analytics endpoint. Without any context, the device shows what
 * it shows without clear signing, as earlier versions of this plugin did.
 */
export const offlineContextModule: ContextModule = {
  getContexts: async () => [],

  getFieldContext: async () => ({
    type: ClearSignContextType.ERROR,
    error: new Error("Clear signing is disabled"),
  }),

  getTypedDataFilters: async () => ({
    type: "error",
    error: new Error("Clear signing is disabled"),
  }),

  report: async () => {},
};
