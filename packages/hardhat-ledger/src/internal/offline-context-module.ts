import type {
  ClearSignContext,
  ContextModule,
  TypedDataClearSignContext,
} from "./dmk-imports.js";

import { ClearSignContextType } from "./dmk-imports.js";

/**
 * A context module that never contacts Ledger's servers.
 *
 * The signer's default context module fetches clear signing metadata, runs
 * Ledger's transaction checks and reports every signature to Ledger's
 * analytics endpoint. This one answers every lookup with "nothing found", so
 * the device signs without that metadata, and it drops the reports.
 */
export const offlineContextModule: ContextModule = {
  getContexts: async (): Promise<ClearSignContext[]> => [],
  getFieldContext: async (): Promise<ClearSignContext> => ({
    type: ClearSignContextType.ERROR,
    error: new Error("Ledger services are disabled"),
  }),
  getTypedDataFilters: async (): Promise<TypedDataClearSignContext> => ({
    type: "error",
    error: new Error("Ledger services are disabled"),
  }),
  report: async (): Promise<void> => {},
};
