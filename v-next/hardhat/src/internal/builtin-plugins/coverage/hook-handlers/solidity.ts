import type { SolidityHooks } from "../../../../types/hooks.js";

import { addStatementCoverageInstrumentation } from "@ignored/edr-optimism";

import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../helpers.js";

export default async (): Promise<Partial<SolidityHooks>> => ({
  preprocessProjectFileBeforeBuilding: async (
    context,
    sourceName,
    fileContent,
    solcVersion,
    next,
  ) => {
    if (context.globalOptions.coverage) {
      const { source, metadata } = addStatementCoverageInstrumentation(
        sourceName,
        fileContent,
        solcVersion,
      );
      const hreImplementation =
        unsafelyCastAsHardhatRuntimeEnvironmentImplementation(context);
      await hreImplementation._coverage.addMetadata(metadata);

      return next(context, sourceName, source, solcVersion);
    } else {
      return next(context, sourceName, fileContent, solcVersion);
    }
  },
});
